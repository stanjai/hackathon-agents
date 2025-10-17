#!/usr/bin/env node
/**
 * Secure Configuration Loader for API Keys - TypeScript Version
 * Loads API keys from config.secret.json or environment variables
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env file if it exists
dotenv.config();

interface APICredentials {
  [key: string]: any;
}

interface APIConfigData {
  enabled: boolean;
  [key: string]: any;
}

interface ConfigFile {
  api_keys: {
    [apiName: string]: APIConfigData;
  };
  environments: {
    [envName: string]: {
      debug: boolean;
      log_level: string;
      use_sandbox: boolean;
    };
  };
  current_environment: string;
}

export class APIConfig {
  constructor(
    public name: string,
    public enabled: boolean,
    public credentials: APICredentials,
    public baseUrl?: string,
    public environment: string = 'development'
  ) {}
}

export class ConfigLoader {
  private configPath: string;
  private config: ConfigFile;
  private environment: string;

  constructor(configPath?: string) {
    this.configPath = configPath || this.findConfigFile();
    this.config = this.loadConfig();
    this.environment = this.config.current_environment || 'development';
  }

  private findConfigFile(): string {
    // Priority order:
    // 1. config.secret.json (actual keys)
    // 2. config.example.json (template)
    
    const currentDir = path.dirname(path.dirname(__filename)); // Go up one level from typescript/
    
    const secretConfig = path.join(currentDir, 'config.secret.json');
    if (fs.existsSync(secretConfig)) {
      console.log('✓ Using config.secret.json');
      return secretConfig;
    }
    
    const exampleConfig = path.join(currentDir, 'config.example.json');
    if (fs.existsSync(exampleConfig)) {
      console.warn('⚠️  Using config.example.json - Copy to config.secret.json and add your keys');
      return exampleConfig;
    }
    
    throw new Error('No configuration file found. Please create config.secret.json');
  }

  private loadConfig(): ConfigFile {
    try {
      const content = fs.readFileSync(this.configPath, 'utf-8');
      // Remove comment lines for valid JSON
      const lines = content.split('\n').filter(line => !line.trim().startsWith('//'));
      const cleanContent = lines.join('\n');
      return JSON.parse(cleanContent);
    } catch (error) {
      console.error(`Failed to load config: ${error}`);
      return {
        api_keys: {},
        environments: {},
        current_environment: 'development'
      };
    }
  }

  getApiConfig(apiName: string): APIConfig | null {
    apiName = apiName.toLowerCase();
    
    if (!(apiName in this.config.api_keys)) {
      console.warn(`API '${apiName}' not found in configuration`);
      return null;
    }
    
    const apiData = this.config.api_keys[apiName];
    
    // Check if API is enabled
    if (!apiData.enabled) {
      console.info(`API '${apiName}' is disabled in configuration`);
      return null;
    }
    
    // Try to load from environment variables first
    const credentials = this.loadFromEnv(apiName, apiData);
    
    // Filter out comment fields and null values
    const cleanedCreds: APICredentials = {};
    for (const [key, value] of Object.entries(credentials)) {
      if (!key.startsWith('//') && value !== null && value !== undefined) {
        cleanedCreds[key] = value;
      }
    }
    
    return new APIConfig(
      apiName,
      true,
      cleanedCreds,
      cleanedCreds.base_url || cleanedCreds.api_base,
      this.environment
    );
  }

  private loadFromEnv(apiName: string, apiData: APIConfigData): APICredentials {
    const credentials: APICredentials = {};
    
    // Map of API fields to environment variable names
    const envMappings: { [api: string]: { [field: string]: string } } = {
      openai: {
        api_key: 'OPENAI_API_KEY',
        organization_id: 'OPENAI_ORG_ID'
      },
      senso: {
        api_key: 'SENSO_API_KEY',
        base_url: 'SENSO_BASE_URL'
      },
      airia: {
        token: 'AIRIA_TOKEN',
        base_url: 'AIRIA_BASE_URL'
      },
      intercom: {
        app_id: 'INTERCOM_APP_ID',
        access_token: 'INTERCOM_ACCESS_TOKEN',
        api_base: 'INTERCOM_API_BASE',
        identity_verification_secret: 'INTERCOM_SECRET'
      },
      stripe: {
        secret_key: 'STRIPE_SECRET_KEY',
        publishable_key: 'STRIPE_PUBLISHABLE_KEY',
        webhook_secret: 'STRIPE_WEBHOOK_SECRET'
      },
      twilio: {
        account_sid: 'TWILIO_ACCOUNT_SID',
        auth_token: 'TWILIO_AUTH_TOKEN',
        phone_number: 'TWILIO_PHONE_NUMBER'
      },
      segment: {
        write_key: 'SEGMENT_WRITE_KEY'
      },
      sentry: {
        dsn: 'SENTRY_DSN',
        environment: 'SENTRY_ENVIRONMENT'
      },
      elevenlabs: {
        api_key: 'ELEVEN_API_KEY',
        voice_id: 'ELEVEN_VOICE_ID'
      },
      snowflake: {
        user: 'SNOWFLAKE_USER',
        password: 'SNOWFLAKE_PASSWORD',
        account: 'SNOWFLAKE_ACCOUNT',
        warehouse: 'SNOWFLAKE_WAREHOUSE',
        database: 'SNOWFLAKE_DATABASE',
        schema: 'SNOWFLAKE_SCHEMA'
      },
      redpanda: {
        brokers: 'REDPANDA_BROKERS',
        topic: 'REDPANDA_TOPIC'
      },
      truefoundry: {
        endpoint: 'TRUEFOUNDRY_ENDPOINT',
        token: 'TRUEFOUNDRY_TOKEN'
      }
    };
    
    // Get environment mappings for this API
    const envMap = envMappings[apiName] || {};
    
    // Load from environment or fall back to config file
    for (const [field, value] of Object.entries(apiData)) {
      if (field.startsWith('//')) {
        continue;
      }
      
      // Check environment variable first
      const envVar = envMap[field];
      if (envVar && process.env[envVar]) {
        credentials[field] = process.env[envVar];
      } else {
        // Use value from config file
        credentials[field] = value;
      }
    }
    
    return credentials;
  }

  getEnabledApis(): string[] {
    const enabled: string[] = [];
    for (const [apiName, apiData] of Object.entries(this.config.api_keys)) {
      if (apiData.enabled) {
        enabled.push(apiName);
      }
    }
    return enabled;
  }

  getAllApis(): string[] {
    return Object.keys(this.config.api_keys);
  }

  validateConfig(): {
    missingKeys: string[];
    placeholderValues: string[];
    disabledApis: string[];
    readyApis: string[];
  } {
    const issues = {
      missingKeys: [] as string[],
      placeholderValues: [] as string[],
      disabledApis: [] as string[],
      readyApis: [] as string[]
    };
    
    for (const [apiName, apiData] of Object.entries(this.config.api_keys)) {
      if (!apiData.enabled) {
        issues.disabledApis.push(apiName);
        continue;
      }
      
      let hasIssues = false;
      for (const [field, value] of Object.entries(apiData)) {
        if (field.startsWith('//') || field === 'enabled') {
          continue;
        }
        
        if (value === null || value === undefined || value === '') {
          issues.missingKeys.push(`${apiName}.${field}`);
          hasIssues = true;
        } else if (typeof value === 'string' && 
                  (value.includes('REPLACE') || 
                   value.includes('your-') || 
                   value === 'sk-...')) {
          issues.placeholderValues.push(`${apiName}.${field}`);
          hasIssues = true;
        }
      }
      
      if (!hasIssues) {
        issues.readyApis.push(apiName);
      }
    }
    
    return issues;
  }

  exportEnvVars(apiName?: string): string {
    const lines: string[] = [];
    
    const apis = apiName 
      ? [apiName].filter(api => api in this.config.api_keys)
      : this.getEnabledApis();
    
    for (const api of apis) {
      const config = this.getApiConfig(api);
      if (!config) {
        continue;
      }
      
      lines.push(`# ${api.toUpperCase()} Configuration`);
      
      // Use environment variable mappings
      const envMappings: { [api: string]: { [field: string]: string } } = {
        openai: { api_key: 'OPENAI_API_KEY' },
        senso: { api_key: 'SENSO_API_KEY', base_url: 'SENSO_BASE_URL' },
        airia: { token: 'AIRIA_TOKEN', base_url: 'AIRIA_BASE_URL' },
        // Add more as needed
      };
      
      const mappings = envMappings[api] || {};
      for (const [field, value] of Object.entries(config.credentials)) {
        const envVar = mappings[field] || `${api.toUpperCase()}_${field.toUpperCase()}`;
        // Don't export sensitive values with placeholders
        if (!value.toString().includes('REPLACE') && value) {
          lines.push(`${envVar}=${value}`);
        }
      }
      
      lines.push('');
    }
    
    return lines.join('\n');
  }

  /**
   * Get configuration for use in the integrator
   */
  getIntegratorConfig(): { openaiKey?: string; enabledApis: string[] } {
    const openaiConfig = this.getApiConfig('openai');
    
    return {
      openaiKey: openaiConfig?.credentials.api_key,
      enabledApis: this.getEnabledApis()
    };
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const loader = new ConfigLoader();
  
  const command = args[0];
  const apiName = args.find(arg => arg.startsWith('--api='))?.split('=')[1];
  
  if (command === 'validate') {
    const issues = loader.validateConfig();
    
    console.log('🔍 Configuration Validation Report');
    console.log('='.repeat(50));
    
    if (issues.readyApis.length > 0) {
      console.log(`\n✅ Ready APIs (${issues.readyApis.length}):`);
      issues.readyApis.forEach(api => console.log(`   - ${api}`));
    }
    
    if (issues.disabledApis.length > 0) {
      console.log(`\n⚫ Disabled APIs (${issues.disabledApis.length}):`);
      issues.disabledApis.forEach(api => console.log(`   - ${api}`));
    }
    
    if (issues.placeholderValues.length > 0) {
      console.log(`\n⚠️  Placeholder values (${issues.placeholderValues.length}):`);
      issues.placeholderValues.slice(0, 5).forEach(item => console.log(`   - ${item}`));
      if (issues.placeholderValues.length > 5) {
        console.log(`   ... and ${issues.placeholderValues.length - 5} more`);
      }
    }
    
    if (issues.missingKeys.length > 0) {
      console.log(`\n❌ Missing keys (${issues.missingKeys.length}):`);
      issues.missingKeys.slice(0, 5).forEach(item => console.log(`   - ${item}`));
    }
  } else if (command === 'list') {
    const enabled = loader.getEnabledApis();
    const allApis = loader.getAllApis();
    
    console.log('📦 Configured APIs');
    console.log('='.repeat(50));
    allApis.forEach(api => {
      const status = enabled.includes(api) ? '✅ Enabled' : '⚫ Disabled';
      console.log(`  ${api.padEnd(15)} ${status}`);
    });
  } else if (command === 'export') {
    const envVars = loader.exportEnvVars(apiName);
    console.log(envVars);
  } else if (command === 'show') {
    if (!apiName) {
      console.log('Please specify an API with --api=<name>');
    } else {
      const config = loader.getApiConfig(apiName);
      if (config) {
        console.log(`Configuration for ${config.name}:`);
        console.log(`  Enabled: ${config.enabled}`);
        console.log(`  Environment: ${config.environment}`);
        console.log(`  Base URL: ${config.baseUrl}`);
        console.log('  Credentials: [HIDDEN]');
      } else {
        console.log(`API '${apiName}' not found or disabled`);
      }
    }
  } else {
    console.log('Usage: npx ts-node configLoader.ts [command] [options]');
    console.log('Commands:');
    console.log('  validate  - Check configuration for issues');
    console.log('  list      - List all configured APIs');
    console.log('  export    - Export as environment variables');
    console.log('  show      - Show configuration for an API (use --api=<name>)');
  }
}

export default ConfigLoader;