#!/usr/bin/env node
/**
 * Main script that combines API integration with git operations - TypeScript Version
 * Analyzes a codebase, generates integrations, and commits them with user approval
 * Focused on web APIs and TypeScript/JavaScript projects
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as readline from 'readline';
import { CodebaseAPIIntegrator, CodebaseAnalyzer } from './codebaseApiIntegrator';
import { GitIntegration, InteractiveGitWorkflow } from './gitIntegration';
import ConfigLoader from './configLoader';

interface IntegrationOptions {
  repoUrl: string;
  apis: string[];
  autoApprove?: boolean;
  pushToRemote?: boolean;
  keepClone?: boolean;
  useConfig?: boolean;
  targetFramework?: 'react' | 'nextjs' | 'vue' | 'angular' | 'express' | 'auto';
  focusWebApis?: boolean;
}

class IntegrateAndCommit {
  private configLoader?: ConfigLoader;
  private rl: readline.Interface;

  constructor(useConfig: boolean = true) {
    if (useConfig) {
      this.configLoader = new ConfigLoader();
    }
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async run(options: IntegrationOptions): Promise<boolean> {
    // Get OpenAI API key
    const apiKey = this.getOpenAIKey();
    if (!apiKey) {
      console.error('❌ OpenAI API key is required');
      console.error('Set OPENAI_API_KEY or configure in config.secret.json');
      return false;
    }

    // Determine clone directory
    const repoName = options.repoUrl.split('/').pop()?.replace('.git', '') || 'repo';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const cloneDir = path.join(process.cwd(), `${repoName}_integration_${timestamp}`);

    try {
      // Clone repository
      console.log('\n📥 Cloning repository...');
      this.cloneRepository(options.repoUrl, cloneDir);

      // Analyze and generate integrations
      console.log(`\n🔧 Generating API integrations for: ${options.apis.join(', ')}`);
      
      // Focus on web APIs if specified
      if (options.focusWebApis) {
        console.log('🌐 Focusing on web-compatible APIs...');
      }

      const integrator = new CodebaseAPIIntegrator(apiKey);
      
      // Generate the integration plan
      const plan = await this.analyzeAndIntegrateWithoutCleanup(
        integrator,
        options.repoUrl,
        options.apis,
        cloneDir,
        options.targetFramework
      );

      // Save integration files
      console.log('\n💾 Saving integration files...');
      integrator.saveIntegrationPlan(plan, cloneDir);

      // Add APIs list for commit message
      (plan as any).apis = options.apis;

      // Create git workflow
      const workflow = new InteractiveGitWorkflow(cloneDir, plan);

      // Show changes summary
      workflow.showChangesSummary();

      // Get approval
      let approved: boolean;
      if (options.autoApprove) {
        console.log('\n✅ Auto-approving changes...');
        approved = true;
      } else {
        approved = await workflow.getUserApproval();
      }

      if (approved) {
        // Commit and push
        const success = await workflow.commitAndPush(options.pushToRemote);

        if (success) {
          console.log('\n' + '='.repeat(60));
          console.log('🎉 SUCCESS!');
          console.log('='.repeat(60));

          if (options.pushToRemote) {
            console.log('✓ Changes committed and pushed');
            console.log(`✓ Repository: ${options.repoUrl}`);
            console.log('✓ Branch: Check GitHub for the new branch');
            console.log('\n📢 Next step: Create a pull request on GitHub');
          } else {
            console.log(`✓ Changes committed locally at: ${cloneDir}`);
            console.log(`\n📢 To push: cd ${cloneDir} && git push`);
          }

          return true;
        } else {
          console.log('\n⚠️  Commit failed');
          return false;
        }
      } else {
        console.log('\n❌ Changes not approved');
        console.log(`Integration files saved at: ${cloneDir}`);
        return false;
      }

    } catch (error) {
      console.error(`\n❌ Error: ${error}`);
      if (error instanceof Error) {
        console.error(error.stack);
      }
      return false;

    } finally {
      // Cleanup
      this.rl.close();
      
      if (!options.keepClone && fs.existsSync(cloneDir)) {
        try {
          fs.rmSync(cloneDir, { recursive: true, force: true });
          console.log('\n🧹 Cleaned up temporary files');
        } catch {
          console.log(`\n⚠️  Could not clean up: ${cloneDir}`);
        }
      }
    }
  }

  private getOpenAIKey(): string | undefined {
    if (this.configLoader) {
      const openaiConfig = this.configLoader.getApiConfig('openai');
      if (openaiConfig) {
        return openaiConfig.credentials.api_key;
      }
    }
    return process.env.OPENAI_API_KEY;
  }

  private cloneRepository(repoUrl: string, targetDir: string): void {
    try {
      execSync(`git clone ${repoUrl} ${targetDir}`, {
        stdio: 'pipe',
        encoding: 'utf-8'
      });
      console.log(`✓ Cloned to: ${targetDir}`);
    } catch (error) {
      throw new Error(`Failed to clone repository: ${error}`);
    }
  }

  private async analyzeAndIntegrateWithoutCleanup(
    integrator: CodebaseAPIIntegrator,
    repoUrl: string,
    apis: string[],
    cloneDir: string,
    targetFramework?: string
  ): Promise<any> {
    // Analyze codebase
    console.log('\n📊 Analyzing codebase structure...');
    const analyzer = new CodebaseAnalyzer(cloneDir);
    const codebaseInfo = await analyzer.analyze();

    // Override framework if specified
    if (targetFramework && targetFramework !== 'auto') {
      codebaseInfo.framework = targetFramework;
      console.log(`  - Using specified framework: ${targetFramework}`);
    } else {
      console.log(`  - Language: ${codebaseInfo.language}`);
      console.log(`  - Framework: ${codebaseInfo.framework || 'None detected'}`);
      console.log(`  - TypeScript: ${codebaseInfo.hasTypeScript ? 'Yes' : 'No'}`);
      console.log(`  - Web App: ${codebaseInfo.isWebApp ? 'Yes' : 'No'}`);
    }

    console.log(`  - Entry points: ${codebaseInfo.entryPoints.slice(0, 3).join(', ')}`);

    // Load context files (implementation simplified for brevity)
    const contextFiles: Record<string, string> = {};
    
    // Load package.json if exists
    const packageJsonPath = path.join(cloneDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      contextFiles['package.json'] = fs.readFileSync(packageJsonPath, 'utf-8').substring(0, 1000);
    }

    // Load main entry point
    if (codebaseInfo.entryPoints.length > 0) {
      const mainFile = path.join(cloneDir, codebaseInfo.entryPoints[0]);
      if (fs.existsSync(mainFile)) {
        contextFiles[codebaseInfo.entryPoints[0]] = fs.readFileSync(mainFile, 'utf-8').substring(0, 2000);
      }
    }

    // Generate integration plan
    console.log('\n🔧 Generating API integrations...');
    const plan = {
      changes: [] as any[],
      npmDependencies: [] as string[],
      envPlaceholders: {} as Record<string, string>,
      notes: [] as string[],
      setupInstructions: [] as string[]
    };

    // Import SUPPORTED_APIS
    const { SUPPORTED_APIS } = await import('./codebaseApiIntegrator');

    for (const apiName of apis) {
      const apiKey = apiName.toLowerCase();
      const apiConfig = SUPPORTED_APIS[apiKey];

      if (!apiConfig) {
        console.log(`  ⚠️  Skipping unknown API: ${apiName}`);
        continue;
      }

      console.log(`  - Generating ${apiConfig.name} integration...`);

      // Generate integration code
      const code = await integrator.generator.generateIntegrationCode(
        apiKey,
        apiConfig,
        codebaseInfo,
        contextFiles
      );

      // Determine file path
      const fileExt = codebaseInfo.hasTypeScript ? 'ts' : 'js';
      const filePath = `integrations/${apiKey}Integration.${fileExt}`;

      plan.changes.push({
        path: filePath,
        original: undefined,
        updated: code,
        description: `${apiConfig.name} integration module`
      });

      // Add dependencies and env vars
      plan.npmDependencies.push(...(apiConfig.npmDependencies || []));
      Object.assign(plan.envPlaceholders, apiConfig.envVars || {});

      // Add setup instructions if any
      if (apiConfig.setupCode) {
        plan.setupInstructions.push(`${apiConfig.name}: ${apiConfig.setupCode}`);
      }
    }

    // Generate usage example
    console.log('\n📝 Generating usage example...');
    const usageCode = await integrator.generator.generateIntegrationUsage(
      apis,
      codebaseInfo,
      {} // Integration modules
    );

    const fileExt = codebaseInfo.hasTypeScript ? 'ts' : 'js';
    plan.changes.push({
      path: `integrations/integrationDemo.${fileExt}`,
      original: undefined,
      updated: usageCode,
      description: 'Integration usage example'
    });

    // Add index file
    const indexContent = this.generateIndexFile(apis, codebaseInfo.hasTypeScript);
    plan.changes.push({
      path: `integrations/index.${fileExt}`,
      original: undefined,
      updated: indexContent,
      description: 'Integration exports'
    });

    // Deduplicate dependencies
    plan.npmDependencies = [...new Set(plan.npmDependencies)];

    // Add notes
    plan.notes.push(`Generated integrations for: ${apis.join(', ')}`);
    plan.notes.push(`Target: ${codebaseInfo.language}${codebaseInfo.hasTypeScript ? ' (TypeScript)' : ''}`);
    if (codebaseInfo.framework) {
      plan.notes.push(`Framework: ${codebaseInfo.framework}`);
    }
    if (codebaseInfo.isWebApp) {
      plan.notes.push('Web application - generated browser-compatible code');
    }

    return plan;
  }

  private generateIndexFile(apis: string[], isTypeScript: boolean): string {
    const imports = apis.map(name => {
      const apiKey = name.toLowerCase();
      return `export * from './${apiKey}Integration';`;
    }).join('\n');

    const header = isTypeScript 
      ? '// API Integration Exports\n' 
      : '/** @module integrations */\n';

    return `${header}\n${imports}\n\nexport { default as demo } from './integrationDemo';\n`;
  }
}

// CLI Entry Point
async function main() {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  const repoIndex = args.findIndex(arg => arg.startsWith('http'));
  if (repoIndex === -1) {
    console.error('Usage: npx ts-node integrateAndCommit.ts <repo-url> <api1> [api2] [...options]');
    console.error('\nOptions:');
    console.error('  --auto             Auto-approve changes');
    console.error('  --no-push          Don\'t push to remote');
    console.error('  --keep-clone       Keep cloned repository');
    console.error('  --no-config        Don\'t use config file');
    console.error('  --framework <name> Target framework (react, nextjs, vue, angular, express)');
    console.error('  --web-apis         Focus on web-compatible APIs');
    console.error('\nExamples:');
    console.error('  npx ts-node integrateAndCommit.ts https://github.com/user/repo intercom stripe segment');
    console.error('  npx ts-node integrateAndCommit.ts https://github.com/vercel/next.js intercom stripe --auto --framework nextjs');
    process.exit(1);
  }

  const repoUrl = args[repoIndex];
  const apis: string[] = [];
  
  // Extract API names (non-flag arguments after repo URL)
  for (let i = repoIndex + 1; i < args.length; i++) {
    if (!args[i].startsWith('--')) {
      apis.push(args[i]);
    }
  }

  if (apis.length === 0) {
    console.error('Error: No APIs specified');
    process.exit(1);
  }

  // Parse options
  const options: IntegrationOptions = {
    repoUrl,
    apis,
    autoApprove: args.includes('--auto'),
    pushToRemote: !args.includes('--no-push'),
    keepClone: args.includes('--keep-clone'),
    useConfig: !args.includes('--no-config'),
    focusWebApis: args.includes('--web-apis')
  };

  // Parse framework option
  const frameworkIndex = args.indexOf('--framework');
  if (frameworkIndex !== -1 && frameworkIndex < args.length - 1) {
    options.targetFramework = args[frameworkIndex + 1] as any;
  }

  // Run integration
  const integrator = new IntegrateAndCommit(options.useConfig);
  const success = await integrator.run(options);

  process.exit(success ? 0 : 1);
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { IntegrateAndCommit, IntegrationOptions };