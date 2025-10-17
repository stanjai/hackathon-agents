#!/usr/bin/env node
/**
 * Codebase API Integration Analyzer - TypeScript Version
 * Analyzes a GitHub repository and suggests code changes to integrate multiple APIs.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as os from 'os';
import OpenAI from 'openai';

// Type definitions
interface ApiConfig {
  name: string;
  description: string;
  npmDependencies: string[];
  envVars: Record<string, string>;
  setupCode?: string;
  isWebOnly?: boolean;
}

interface FileChange {
  path: string;
  original?: string;
  updated: string;
  description: string;
}

interface IntegrationPlan {
  changes: FileChange[];
  npmDependencies: string[];
  envPlaceholders: Record<string, string>;
  notes: string[];
  setupInstructions?: string[];
}

interface CodebaseInfo {
  language: string | null;
  framework: string | null;
  entryPoints: string[];
  structure: Record<string, any>;
  isWebApp: boolean;
  hasTypeScript: boolean;
}

// API Configurations
export const SUPPORTED_APIS: Record<string, ApiConfig> = {
  senso: {
    name: "Senso",
    description: "Event tracking and analytics API",
    npmDependencies: ["axios"],
    envVars: {
      "SENSO_API_KEY": "<your-api-key>",
      "SENSO_BASE_URL": "https://sdk.senso.ai/api/v1"
    }
  },
  airia: {
    name: "Airia",
    description: "AI-powered data analysis API",
    npmDependencies: ["axios"],
    envVars: {
      "AIRIA_TOKEN": "<your-token>",
      "AIRIA_BASE_URL": "https://api.airia.ai/v1"
    }
  },
  openai: {
    name: "OpenAI",
    description: "AI language models and embeddings",
    npmDependencies: ["openai"],
    envVars: {
      "OPENAI_API_KEY": "<your-api-key>"
    }
  },
  intercom: {
    name: "Intercom",
    description: "Customer messaging and support platform",
    npmDependencies: ["intercom-client"],
    envVars: {
      "INTERCOM_APP_ID": "<your-workspace-id>",
      "INTERCOM_ACCESS_TOKEN": "<your-access-token>",
      "INTERCOM_API_BASE": "https://api.intercom.io"  // Use api.eu.intercom.io for EU, api.au.intercom.io for AU
    },
    isWebOnly: false,
    setupCode: `
// For web applications, add this to your HTML:
/*
<script>
  window.intercomSettings = {
    api_base: process.env.INTERCOM_API_BASE,
    app_id: process.env.INTERCOM_APP_ID,
    user_id: currentUser.id,
    name: currentUser.name,
    email: currentUser.email,
    created_at: currentUser.createdAt
  };
</script>
<script src="https://widget.intercom.io/widget/{app_id}"></script>
*/

// For Node.js/server-side:
import Intercom from 'intercom-client';
const client = new Intercom.Client({ token: process.env.INTERCOM_ACCESS_TOKEN });
`
  },
  elevenlabs: {
    name: "ElevenLabs",
    description: "Text-to-speech synthesis API",
    npmDependencies: ["elevenlabs"],
    envVars: {
      "ELEVEN_API_KEY": "<your-api-key>",
      "ELEVEN_VOICE_ID": "Rachel"
    }
  },
  sentry: {
    name: "Sentry",
    description: "Error tracking and performance monitoring",
    npmDependencies: ["@sentry/node", "@sentry/tracing"],
    envVars: {
      "SENTRY_DSN": "https://<key>@<org>.ingest.sentry.io/<project>"
    }
  },
  snowflake: {
    name: "Snowflake",
    description: "Cloud data warehouse",
    npmDependencies: ["snowflake-sdk"],
    envVars: {
      "SNOWFLAKE_USER": "<user>",
      "SNOWFLAKE_PASSWORD": "<password>",
      "SNOWFLAKE_ACCOUNT": "<account.region>",
      "SNOWFLAKE_WAREHOUSE": "COMPUTE_WH",
      "SNOWFLAKE_DATABASE": "DEMO_DB",
      "SNOWFLAKE_SCHEMA": "PUBLIC"
    }
  },
  redpanda: {
    name: "Redpanda",
    description: "Streaming data platform",
    npmDependencies: ["kafkajs"],
    envVars: {
      "REDPANDA_BROKERS": "localhost:9092",
      "REDPANDA_TOPIC": "events.demo"
    }
  },
  truefoundry: {
    name: "TrueFoundry",
    description: "ML model deployment platform",
    npmDependencies: ["axios"],
    envVars: {
      "TRUEFOUNDRY_ENDPOINT": "https://your-control-plane.truefoundry.com/api/llm",  // Replace with your control plane URL
      "TRUEFOUNDRY_TOKEN": "<token>"
    }
  },
  stripe: {
    name: "Stripe",
    description: "Payment processing platform",
    npmDependencies: ["stripe"],
    envVars: {
      "STRIPE_SECRET_KEY": "sk_test_...",
      "STRIPE_PUBLISHABLE_KEY": "pk_test_...",
      "STRIPE_WEBHOOK_SECRET": "whsec_..."
    }
  },
  twilio: {
    name: "Twilio",
    description: "Communication APIs (SMS, Voice, Video)",
    npmDependencies: ["twilio"],
    envVars: {
      "TWILIO_ACCOUNT_SID": "<your-account-sid>",
      "TWILIO_AUTH_TOKEN": "<your-auth-token>",
      "TWILIO_PHONE_NUMBER": "+1234567890"
    }
  },
  segment: {
    name: "Segment",
    description: "Customer data platform",
    npmDependencies: ["analytics-node"],
    envVars: {
      "SEGMENT_WRITE_KEY": "<your-write-key>"
    }
  }
};

/**
 * Analyzes a codebase to understand its structure
 */
export class CodebaseAnalyzer {
  private repoPath: string;
  private structure: Record<string, any> = {};
  private mainLanguage: string | null = null;
  private framework: string | null = null;
  private entryPoints: string[] = [];
  private isWebApp: boolean = false;
  private hasTypeScript: boolean = false;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
  }

  async analyze(): Promise<CodebaseInfo> {
    await this.detectLanguage();
    await this.findEntryPoints();
    await this.detectFramework();
    await this.checkWebApp();

    return {
      language: this.mainLanguage,
      framework: this.framework,
      entryPoints: this.entryPoints,
      structure: this.structure,
      isWebApp: this.isWebApp,
      hasTypeScript: this.hasTypeScript
    };
  }

  private async detectLanguage(): Promise<void> {
    const extensions: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust',
      '.rb': 'ruby',
      '.php': 'php'
    };

    const fileCounts: Record<string, number> = {};

    const walkDir = (dir: string): void => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          walkDir(filePath);
        } else if (stat.isFile()) {
          const ext = path.extname(file);
          if (extensions[ext]) {
            fileCounts[extensions[ext]] = (fileCounts[extensions[ext]] || 0) + 1;
          }
        }
      }
    };

    walkDir(this.repoPath);

    if (fileCounts.typescript) {
      this.hasTypeScript = true;
      this.mainLanguage = 'typescript';
    } else if (fileCounts.javascript) {
      this.mainLanguage = 'javascript';
    } else if (Object.keys(fileCounts).length > 0) {
      this.mainLanguage = Object.keys(fileCounts).reduce((a, b) => 
        fileCounts[a] > fileCounts[b] ? a : b
      );
    }
  }

  private async findEntryPoints(): Promise<void> {
    const commonEntryPoints: Record<string, string[]> = {
      javascript: ['index.js', 'app.js', 'server.js', 'main.js', 'src/index.js'],
      typescript: ['index.ts', 'app.ts', 'server.ts', 'main.ts', 'src/index.ts'],
      python: ['app.py', 'main.py', 'run.py', 'server.py', '__main__.py']
    };

    if (this.mainLanguage && commonEntryPoints[this.mainLanguage]) {
      for (const entry of commonEntryPoints[this.mainLanguage]) {
        const fullPath = path.join(this.repoPath, entry);
        if (fs.existsSync(fullPath)) {
          this.entryPoints.push(entry);
        }
      }
    }
  }

  private async detectFramework(): Promise<void> {
    const packageJsonPath = path.join(this.repoPath, 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };

      const frameworks: Record<string, string[]> = {
        'next': ['Next.js'],
        'react': ['React'],
        'vue': ['Vue'],
        'angular': ['Angular'],
        'express': ['Express'],
        'fastify': ['Fastify'],
        'koa': ['Koa'],
        'nestjs': ['NestJS'],
        'svelte': ['Svelte'],
        'nuxt': ['Nuxt']
      };

      for (const [pkg, names] of Object.entries(frameworks)) {
        if (deps[pkg] || deps[`@${pkg}/core`]) {
          this.framework = names[0];
          break;
        }
      }
    }
  }

  private async checkWebApp(): Promise<void> {
    // Check for web app indicators
    const webIndicators = [
      'public/index.html',
      'index.html',
      'src/index.html',
      'pages',
      'components',
      'src/components'
    ];

    for (const indicator of webIndicators) {
      if (fs.existsSync(path.join(this.repoPath, indicator))) {
        this.isWebApp = true;
        break;
      }
    }

    // Also check package.json for web frameworks
    if (this.framework && ['React', 'Vue', 'Angular', 'Next.js', 'Nuxt', 'Svelte'].includes(this.framework)) {
      this.isWebApp = true;
    }
  }
}

/**
 * Generates API integration code using OpenAI
 */
export class APIIntegrationGenerator {
  private client: OpenAI;

  constructor(openaiApiKey: string) {
    this.client = new OpenAI({ apiKey: openaiApiKey });
  }

  async generateIntegrationCode(
    apiName: string,
    apiConfig: ApiConfig,
    codebaseInfo: CodebaseInfo,
    contextFiles: Record<string, string>
  ): Promise<string> {
    const isTypeScript = codebaseInfo.hasTypeScript || codebaseInfo.language === 'typescript';
    const fileExt = isTypeScript ? 'ts' : 'js';

    const prompt = `
You are a senior software engineer tasked with integrating the ${apiConfig.name} API into an existing codebase.

Codebase Information:
- Language: ${codebaseInfo.language}
- TypeScript: ${isTypeScript ? 'Yes' : 'No'}
- Framework: ${codebaseInfo.framework || 'None detected'}
- Is Web App: ${codebaseInfo.isWebApp ? 'Yes' : 'No'}
- Main entry points: ${codebaseInfo.entryPoints.join(', ')}

API to integrate: ${apiConfig.name}
Description: ${apiConfig.description}
Required environment variables: ${JSON.stringify(apiConfig.envVars, null, 2)}
Required npm packages: ${apiConfig.npmDependencies.join(', ')}
${apiConfig.setupCode ? `Setup instructions:\n${apiConfig.setupCode}` : ''}

Context from existing code:
${this.formatContext(contextFiles)}

Please generate:
1. A standalone integration module for ${apiConfig.name} in ${isTypeScript ? 'TypeScript' : 'JavaScript'}
2. Include proper error handling and logging
3. Provide both synchronous and asynchronous versions if applicable
4. Include ${isTypeScript ? 'TypeScript types and interfaces' : 'JSDoc comments'}
5. Create reusable functions that can be imported and used throughout the codebase
6. If this is a web app and the API supports browser usage, include browser-compatible code

Return only the code without markdown formatting or explanations.
`;

    const response = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert software engineer who writes clean, production-ready TypeScript/JavaScript code.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    return response.choices[0].message.content?.trim() || '';
  }

  async generateIntegrationUsage(
    apiNames: string[],
    codebaseInfo: CodebaseInfo,
    integrationModules: Record<string, string>
  ): Promise<string> {
    const apiList = apiNames.map(name => SUPPORTED_APIS[name].name).join(', ');
    const isTypeScript = codebaseInfo.hasTypeScript || codebaseInfo.language === 'typescript';

    const prompt = `
You have integrated the following APIs into a ${codebaseInfo.language} codebase: ${apiList}

Framework: ${codebaseInfo.framework || 'None'}
TypeScript: ${isTypeScript ? 'Yes' : 'No'}
Is Web App: ${codebaseInfo.isWebApp ? 'Yes' : 'No'}

Integration modules created:
${JSON.stringify(Object.keys(integrationModules), null, 2)}

Generate a demonstration module that:
1. Imports all the integration modules
2. Shows a practical example of using them together in a data pipeline or workflow
3. Includes proper error handling
4. Can be run as a standalone script or imported as a module
5. Follows the patterns of the existing codebase
6. Uses ${isTypeScript ? 'TypeScript with proper types' : 'JavaScript with JSDoc'}

The example should be realistic and show how these APIs might work together in a real application.

Return only the code without markdown formatting or explanations.
`;

    const response = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert software engineer who writes practical, production-ready code.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    return response.choices[0].message.content?.trim() || '';
  }

  private formatContext(contextFiles: Record<string, string>): string {
    if (!contextFiles || Object.keys(contextFiles).length === 0) {
      return 'No context files provided';
    }

    const formatted: string[] = [];
    const entries = Object.entries(contextFiles).slice(0, 3); // Limit to 3 files

    for (const [filePath, content] of entries) {
      let truncatedContent = content;
      if (content.length > 1000) {
        truncatedContent = content.substring(0, 1000) + '\n... (truncated)';
      }
      formatted.push(`File: ${filePath}\n${truncatedContent}`);
    }

    return formatted.join('\n\n');
  }
}

/**
 * Main class for integrating APIs into a codebase
 */
export class CodebaseAPIIntegrator {
  private openaiApiKey: string;
  private generator: APIIntegrationGenerator;

  constructor(openaiApiKey: string) {
    this.openaiApiKey = openaiApiKey;
    this.generator = new APIIntegrationGenerator(openaiApiKey);
  }

  cloneRepository(repoUrl: string): string {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codebase_'));
    
    try {
      execSync(`git clone --depth 1 ${repoUrl} ${tempDir}`, {
        stdio: 'pipe',
        encoding: 'utf-8'
      });
      console.log(`✓ Cloned repository to ${tempDir}`);
      return tempDir;
    } catch (error) {
      console.error(`✗ Failed to clone repository: ${error}`);
      fs.rmSync(tempDir, { recursive: true, force: true });
      throw error;
    }
  }

  async analyzeAndIntegrate(
    repoUrl: string,
    apiNames: string[]
  ): Promise<IntegrationPlan> {
    // Validate API names
    const invalidApis = apiNames.filter(api => !SUPPORTED_APIS[api.toLowerCase()]);
    if (invalidApis.length > 0) {
      throw new Error(`Unsupported APIs: ${invalidApis.join(', ')}. Supported: ${Object.keys(SUPPORTED_APIS).join(', ')}`);
    }

    console.log(`\n🔍 Analyzing repository: ${repoUrl}`);
    console.log(`📦 APIs to integrate: ${apiNames.join(', ')}`);

    // Clone repository
    const repoPath = this.cloneRepository(repoUrl);

    try {
      // Analyze codebase
      console.log('\n📊 Analyzing codebase structure...');
      const analyzer = new CodebaseAnalyzer(repoPath);
      const codebaseInfo = await analyzer.analyze();

      console.log(`  - Language: ${codebaseInfo.language}`);
      console.log(`  - Framework: ${codebaseInfo.framework || 'None detected'}`);
      console.log(`  - TypeScript: ${codebaseInfo.hasTypeScript ? 'Yes' : 'No'}`);
      console.log(`  - Web App: ${codebaseInfo.isWebApp ? 'Yes' : 'No'}`);
      console.log(`  - Entry points: ${codebaseInfo.entryPoints.slice(0, 3).join(', ')}`);

      // Load context files
      const contextFiles = this.loadContextFiles(repoPath, codebaseInfo);

      // Generate integration plan
      const plan: IntegrationPlan = {
        changes: [],
        npmDependencies: [],
        envPlaceholders: {},
        notes: [],
        setupInstructions: []
      };

      const integrationModules: Record<string, string> = {};
      const isTypeScript = codebaseInfo.hasTypeScript || codebaseInfo.language === 'typescript';
      const fileExt = isTypeScript ? 'ts' : 'js';

      console.log('\n🔧 Generating API integrations...');

      // Generate integration code for each API
      for (const apiName of apiNames) {
        const apiKey = apiName.toLowerCase();
        const apiConfig = SUPPORTED_APIS[apiKey];

        console.log(`  - Generating ${apiConfig.name} integration...`);

        // Generate integration code
        const code = await this.generator.generateIntegrationCode(
          apiKey,
          apiConfig,
          codebaseInfo,
          contextFiles
        );

        const filePath = `integrations/${apiKey}Integration.${fileExt}`;
        integrationModules[filePath] = code;

        // Add to plan
        plan.changes.push({
          path: filePath,
          original: undefined,
          updated: code,
          description: `${apiConfig.name} integration module`
        });

        // Add dependencies and env vars
        plan.npmDependencies.push(...apiConfig.npmDependencies);
        Object.assign(plan.envPlaceholders, apiConfig.envVars);

        // Add setup instructions if any
        if (apiConfig.setupCode) {
          plan.setupInstructions?.push(`${apiConfig.name}: ${apiConfig.setupCode}`);
        }
      }

      // Generate usage example
      console.log('\n📝 Generating usage example...');
      const usageCode = await this.generator.generateIntegrationUsage(
        apiNames,
        codebaseInfo,
        integrationModules
      );

      const usagePath = `integrations/integrationDemo.${fileExt}`;
      plan.changes.push({
        path: usagePath,
        original: undefined,
        updated: usageCode,
        description: 'Integration usage example'
      });

      // Add index file for exports
      const indexContent = this.generateIndexFile(apiNames, isTypeScript);
      plan.changes.push({
        path: `integrations/index.${fileExt}`,
        original: undefined,
        updated: indexContent,
        description: 'Integration exports'
      });

      // Deduplicate dependencies
      plan.npmDependencies = [...new Set(plan.npmDependencies)];

      // Add notes
      plan.notes.push(`Generated integrations for: ${apiNames.join(', ')}`);
      plan.notes.push(`Target language: ${codebaseInfo.language}`);
      if (codebaseInfo.framework) {
        plan.notes.push(`Framework detected: ${codebaseInfo.framework}`);
      }
      if (codebaseInfo.isWebApp) {
        plan.notes.push('Web application detected - generated browser-compatible code where applicable');
      }
      plan.notes.push('Remember to set all environment variables before running');

      return plan;

    } finally {
      // Clean up cloned repository
      if (fs.existsSync(repoPath)) {
        fs.rmSync(repoPath, { recursive: true, force: true });
        console.log('\n🧹 Cleaned up temporary directory');
      }
    }
  }

  private loadContextFiles(repoPath: string, codebaseInfo: CodebaseInfo): Record<string, string> {
    const context: Record<string, string> = {};

    // Load entry points
    for (const entryPoint of codebaseInfo.entryPoints.slice(0, 2)) {
      const filePath = path.join(repoPath, entryPoint);
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          context[entryPoint] = content.substring(0, 2000); // Limit size
        } catch (error) {
          // Ignore read errors
        }
      }
    }

    // Load package.json
    const packageJsonPath = path.join(repoPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const content = fs.readFileSync(packageJsonPath, 'utf-8');
        context['package.json'] = content.substring(0, 1000);
      } catch (error) {
        // Ignore read errors
      }
    }

    // Load tsconfig.json if TypeScript
    if (codebaseInfo.hasTypeScript) {
      const tsconfigPath = path.join(repoPath, 'tsconfig.json');
      if (fs.existsSync(tsconfigPath)) {
        try {
          const content = fs.readFileSync(tsconfigPath, 'utf-8');
          context['tsconfig.json'] = content.substring(0, 1000);
        } catch (error) {
          // Ignore read errors
        }
      }
    }

    return context;
  }

  private generateIndexFile(apiNames: string[], isTypeScript: boolean): string {
    const imports = apiNames.map(name => {
      const apiKey = name.toLowerCase();
      return `export * from './${apiKey}Integration';`;
    }).join('\n');

    const header = isTypeScript ? '// API Integration Exports\n' : '/** API Integration Exports */\n';

    return `${header}\n${imports}\n\nexport { default as demo } from './integrationDemo';\n`;
  }

  saveIntegrationPlan(plan: IntegrationPlan, outputDir: string): void {
    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save all file changes
    for (const change of plan.changes) {
      const filePath = path.join(outputDir, change.path);
      const fileDir = path.dirname(filePath);
      
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, change.updated);
      console.log(`✓ Created ${change.path}`);
    }

    // Save package.json additions
    if (plan.npmDependencies.length > 0) {
      const packageAdditions = {
        dependencies: plan.npmDependencies.reduce((acc, dep) => {
          acc[dep] = 'latest';
          return acc;
        }, {} as Record<string, string>)
      };
      
      const packageFile = path.join(outputDir, 'package_additions.json');
      fs.writeFileSync(packageFile, JSON.stringify(packageAdditions, null, 2));
      console.log('✓ Created package_additions.json');
    }

    // Save environment variables
    if (Object.keys(plan.envPlaceholders).length > 0) {
      const envContent = Object.entries(plan.envPlaceholders)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      
      const envFile = path.join(outputDir, '.env.example');
      fs.writeFileSync(envFile, envContent + '\n');
      console.log('✓ Created .env.example');
    }

    // Save integration notes
    if (plan.notes.length > 0) {
      const notesContent = `# API Integration Notes\n\n${plan.notes.map(note => `- ${note}`).join('\n')}\n`;
      const notesFile = path.join(outputDir, 'INTEGRATION_NOTES.md');
      fs.writeFileSync(notesFile, notesContent);
      console.log('✓ Created INTEGRATION_NOTES.md');
    }

    // Save setup instructions
    if (plan.setupInstructions && plan.setupInstructions.length > 0) {
      const setupContent = `# Setup Instructions\n\n${plan.setupInstructions.join('\n\n')}\n`;
      const setupFile = path.join(outputDir, 'SETUP.md');
      fs.writeFileSync(setupFile, setupContent);
      console.log('✓ Created SETUP.md');
    }
  }
}