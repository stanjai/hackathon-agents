#!/usr/bin/env node
/**
 * Interactive test script for the Codebase API Integrator - TypeScript Version
 * Allows easy testing with different GitHub URLs and API combinations
 */

import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { CodebaseAPIIntegrator, SUPPORTED_APIS } from './codebaseApiIntegrator';

// ANSI color codes
const Colors = {
  HEADER: '\x1b[95m',
  BLUE: '\x1b[94m',
  CYAN: '\x1b[96m',
  GREEN: '\x1b[92m',
  YELLOW: '\x1b[93m',
  RED: '\x1b[91m',
  END: '\x1b[0m',
  BOLD: '\x1b[1m'
};

function printColored(text: string, color: string = Colors.END): void {
  console.log(`${color}${text}${Colors.END}`);
}

function printHeader(text: string): void {
  printColored('\n' + '='.repeat(60), Colors.CYAN);
  printColored(text, Colors.BOLD);
  printColored('='.repeat(60), Colors.CYAN);
}

interface TestConfig {
  name: string;
  repo: string;
  apis: string[];
  output: string;
}

class InteractiveTest {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(prompt, (answer) => {
        resolve(answer);
      });
    });
  }

  close(): void {
    this.rl.close();
  }

  async run(): Promise<void> {
    printHeader('🚀 Codebase API Integrator - TypeScript Interactive Test');

    // Check for OpenAI API key
    let apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      printColored('⚠️  Warning: OPENAI_API_KEY not set in environment', Colors.YELLOW);
      apiKey = await this.question('Enter your OpenAI API key (or press Enter to skip): ');
      if (apiKey) {
        process.env.OPENAI_API_KEY = apiKey;
      }
    } else {
      printColored('✓ OpenAI API key found in environment', Colors.GREEN);
    }

    // Get GitHub URL
    printColored('\n📦 Enter GitHub Repository URL:', Colors.BLUE);
    console.log('Examples:');
    console.log('  - https://github.com/vercel/next.js');
    console.log('  - https://github.com/expressjs/express');
    console.log('  - https://github.com/microsoft/TypeScript');

    let repoUrl = await this.question('\nRepository URL: ');
    if (!repoUrl.trim()) {
      repoUrl = 'https://github.com/vercel/next-learn';
      printColored(`Using default: ${repoUrl}`, Colors.YELLOW);
    }

    // Select APIs
    printColored('\n🔧 Available APIs:', Colors.BLUE);
    const apiKeys = Object.keys(SUPPORTED_APIS);
    apiKeys.forEach((key, index) => {
      const api = SUPPORTED_APIS[key];
      console.log(`  ${index + 1}. ${api.name.padEnd(15)} - ${api.description}`);
    });

    console.log('\nSelect APIs to integrate:');
    console.log('  - Enter numbers separated by spaces (e.g., "1 3 5")');
    console.log('  - Enter "all" for all APIs');
    console.log('  - Enter "web" for web-focused APIs (intercom, segment, stripe)');
    console.log('  - Enter "quick" for a quick test set (senso, airia, openai)');
    console.log('  - Press Enter for default (senso, airia, openai)');

    const selection = (await this.question('\nYour selection: ')).trim().toLowerCase();

    let selectedApis: string[];
    if (selection === 'all') {
      selectedApis = apiKeys;
    } else if (selection === 'web') {
      selectedApis = ['intercom', 'segment', 'stripe', 'sentry'];
    } else if (selection === 'quick' || selection === '') {
      selectedApis = ['senso', 'airia', 'openai'];
    } else {
      try {
        const indices = selection.split(' ').map(x => parseInt(x) - 1);
        selectedApis = indices
          .filter(i => i >= 0 && i < apiKeys.length)
          .map(i => apiKeys[i]);
      } catch {
        printColored('Invalid selection, using defaults', Colors.YELLOW);
        selectedApis = ['senso', 'airia', 'openai'];
      }
    }

    printColored(`\n✓ Selected APIs: ${selectedApis.join(', ')}`, Colors.GREEN);

    // Output directory
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const defaultOutput = `./test_output_${timestamp}`;

    const outputDir = (await this.question(`\nOutput directory [${defaultOutput}]: `)).trim() || defaultOutput;

    // Dry run option
    const dryRun = (await this.question('\nDry run? (just analyze, don\'t generate) [y/N]: ')).trim().toLowerCase() === 'y';

    this.close();

    // Run the test
    await this.testIntegration(repoUrl, selectedApis, outputDir, dryRun);
  }

  private async testIntegration(
    repoUrl: string,
    apis: string[],
    outputDir: string,
    dryRun: boolean = false
  ): Promise<void> {
    printHeader('🔍 Starting Integration Test');

    if (dryRun) {
      printColored('Running in DRY RUN mode - analysis only', Colors.YELLOW);
      // For dry run, just show what would be done
      console.log('\nWould integrate the following:');
      console.log(`  Repository: ${repoUrl}`);
      console.log(`  APIs: ${apis.join(', ')}`);
      console.log(`  Output: ${outputDir}`);
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      printColored('❌ OpenAI API key required for code generation', Colors.RED);
      return;
    }

    try {
      console.log('\n🤖 Initializing integrator...');
      const integrator = new CodebaseAPIIntegrator(apiKey);

      console.log('\n📦 Analyzing and generating integrations...');
      const plan = await integrator.analyzeAndIntegrate(repoUrl, apis);

      console.log(`\n💾 Saving to ${outputDir}...`);
      integrator.saveIntegrationPlan(plan, outputDir);

      // Display summary
      printColored('\n✅ Integration Complete!', Colors.GREEN);
      printColored('\n📊 Summary:', Colors.BLUE);
      console.log(`  Files created: ${plan.changes.length}`);
      console.log(`  Dependencies: ${plan.npmDependencies.length}`);
      console.log(`  Environment variables: ${Object.keys(plan.envPlaceholders).length}`);

      if (plan.npmDependencies.length > 0) {
        printColored('\n📦 Dependencies to install:', Colors.BLUE);
        plan.npmDependencies.slice(0, 5).forEach(dep => {
          console.log(`  npm install ${dep}`);
        });
        if (plan.npmDependencies.length > 5) {
          console.log(`  ... and ${plan.npmDependencies.length - 5} more`);
        }
      }

      if (Object.keys(plan.envPlaceholders).length > 0) {
        printColored('\n🔐 Environment variables needed:', Colors.BLUE);
        Object.keys(plan.envPlaceholders).slice(0, 5).forEach(key => {
          console.log(`  ${key}`);
        });
        if (Object.keys(plan.envPlaceholders).length > 5) {
          console.log(`  ... and ${Object.keys(plan.envPlaceholders).length - 5} more`);
        }
      }

      printColored(`\n📁 Output saved to: ${outputDir}`, Colors.GREEN);
      console.log('  Run the following to see the files:');
      console.log(`    ls -la ${outputDir}/`);
      console.log(`    cat ${outputDir}/INTEGRATION_NOTES.md`);

    } catch (error) {
      printColored(`\n❌ Error: ${error}`, Colors.RED);
      if (error instanceof Error) {
        console.error(error.stack);
      }
    }
  }
}

async function quickTest(): Promise<void> {
  printHeader('⚡ Quick Test Mode');

  const testConfigs: TestConfig[] = [
    {
      name: 'Next.js with Web APIs',
      repo: 'https://github.com/vercel/next-learn',
      apis: ['intercom', 'segment', 'stripe', 'sentry'],
      output: './test_nextjs_web'
    },
    {
      name: 'Express with Data APIs',
      repo: 'https://github.com/expressjs/express',
      apis: ['openai', 'snowflake', 'redpanda'],
      output: './test_express_data'
    },
    {
      name: 'TypeScript Project with Communication APIs',
      repo: 'https://github.com/microsoft/TypeScript',
      apis: ['twilio', 'elevenlabs', 'openai'],
      output: './test_typescript_comm'
    }
  ];

  console.log('Select a test configuration:');
  testConfigs.forEach((config, index) => {
    console.log(`  ${index + 1}. ${config.name}`);
    console.log(`     Repo: ${config.repo}`);
    console.log(`     APIs: ${config.apis.join(', ')}`);
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const choice = await new Promise<string>((resolve) => {
    rl.question('\nSelect (1-3) or Enter to cancel: ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });

  if (choice === '1' || choice === '2' || choice === '3') {
    const config = testConfigs[parseInt(choice) - 1];
    printColored(`\nRunning: ${config.name}`, Colors.GREEN);
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      printColored('❌ OpenAI API key required', Colors.RED);
      return;
    }

    const integrator = new CodebaseAPIIntegrator(apiKey);
    const plan = await integrator.analyzeAndIntegrate(config.repo, config.apis);
    integrator.saveIntegrationPlan(plan, config.output);
    
    printColored('✅ Test complete!', Colors.GREEN);
  }
}

async function validateApiConfigs(): Promise<void> {
  printHeader('🔍 API Configuration Review');

  printColored('\n⚠️  IMPORTANT: Review these API configurations:', Colors.YELLOW);
  printColored('Some URLs may be placeholders that need updating.\n', Colors.YELLOW);

  const verifiedApis = ['openai', 'sentry', 'snowflake', 'elevenlabs', 'stripe', 'twilio', 'segment', 'intercom'];
  const needsConfig = ['senso', 'airia', 'truefoundry'];

  for (const [key, config] of Object.entries(SUPPORTED_APIS)) {
    printColored(`\n${config.name}:`, Colors.BLUE);
    console.log(`  Description: ${config.description}`);
    console.log(`  Dependencies: ${config.npmDependencies.join(', ') || 'None'}`);

    if (config.envVars) {
      console.log('  Environment Variables:');
      for (const [varName, value] of Object.entries(config.envVars)) {
        const status = verifiedApis.includes(key) ? '✅' : needsConfig.includes(key) ? '❌ NEEDS UPDATE' : '⚠️  CHECK';
        console.log(`    ${varName}: ${value} ${status}`);
      }
    }

    if (config.isWebOnly) {
      console.log('  ⚠️  Note: Primarily for web/browser usage');
    }
  }

  printColored('\n📝 Configuration Status:', Colors.CYAN);
  console.log(`✅ Verified APIs: ${verifiedApis.join(', ')}`);
  console.log(`❌ Need real endpoints: ${needsConfig.join(', ')}`);
}

// Main entry point
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--quick')) {
    await quickTest();
  } else if (args.includes('--validate')) {
    await validateApiConfigs();
  } else if (args.includes('--help')) {
    console.log('Usage: npx ts-node testIntegrator.ts [options]');
    console.log('Options:');
    console.log('  --quick     Run quick test with presets');
    console.log('  --validate  Validate API configurations');
    console.log('  --help      Show this help message');
    console.log('\nOr run without options for interactive mode');
  } else {
    // Interactive mode
    const test = new InteractiveTest();
    await test.run();
  }

  printColored('\n✨ Done!', Colors.GREEN);
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}