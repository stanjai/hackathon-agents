#!/usr/bin/env node
/**
 * Git Integration Module - TypeScript Version
 * Handles git operations for committing and pushing integration changes
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as readline from 'readline';

interface GitCommitInfo {
  message: string;
  files: string[];
  branch?: string;
  authorName?: string;
  authorEmail?: string;
}

interface IntegrationPlan {
  changes: Array<{
    path: string;
    original?: string;
    updated: string;
    description: string;
  }>;
  npmDependencies?: string[];
  pip_dependencies?: string[];
  envPlaceholders?: Record<string, string>;
  env_placeholders?: Record<string, string>;
  notes?: string[];
  apis?: string[];
}

export class GitIntegration {
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    
    if (!fs.existsSync(repoPath)) {
      throw new Error(`Repository path ${repoPath} does not exist`);
    }
    
    if (!this.isGitRepo()) {
      throw new Error(`${repoPath} is not a git repository`);
    }
  }

  private isGitRepo(): boolean {
    const gitDir = path.join(this.repoPath, '.git');
    return fs.existsSync(gitDir);
  }

  private runGitCommand(command: string[]): { code: number; stdout: string; stderr: string } {
    try {
      const stdout = execSync(`git ${command.join(' ')}`, {
        cwd: this.repoPath,
        encoding: 'utf-8'
      });
      return { code: 0, stdout, stderr: '' };
    } catch (error: any) {
      return {
        code: error.status || 1,
        stdout: error.stdout?.toString() || '',
        stderr: error.stderr?.toString() || error.message
      };
    }
  }

  getCurrentBranch(): string {
    const result = this.runGitCommand(['branch', '--show-current']);
    return result.stdout.trim();
  }

  createIntegrationBranch(branchName?: string): string {
    if (!branchName) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      branchName = `api-integrations-${timestamp}`;
    }

    // Check if branch exists
    const checkResult = this.runGitCommand(['rev-parse', '--verify', branchName]);
    
    if (checkResult.code === 0) {
      console.log(`Branch ${branchName} already exists, using it`);
      this.runGitCommand(['checkout', branchName]);
    } else {
      console.log(`Creating new branch: ${branchName}`);
      this.runGitCommand(['checkout', '-b', branchName]);
    }

    return branchName;
  }

  addFiles(files: string[]): void {
    for (const filePath of files) {
      const fullPath = path.join(this.repoPath, filePath);
      if (fs.existsSync(fullPath)) {
        this.runGitCommand(['add', filePath]);
        console.log(`  Added: ${filePath}`);
      } else {
        console.log(`  Warning: File not found: ${filePath}`);
      }
    }
  }

  commitChanges(message: string, authorName?: string, authorEmail?: string): string {
    const commitArgs = ['commit', '-m', message];
    
    if (authorName && authorEmail) {
      commitArgs.push('--author', `${authorName} <${authorEmail}>`);
    }

    this.runGitCommand(commitArgs);
    
    // Get commit hash
    const hashResult = this.runGitCommand(['rev-parse', 'HEAD']);
    return hashResult.stdout.trim();
  }

  pushChanges(branch: string, remote: string = 'origin', force: boolean = false): boolean {
    const pushArgs = ['push', remote, branch];
    if (force) {
      pushArgs.push('--force-with-lease');
    }

    const result = this.runGitCommand(pushArgs);
    
    if (result.code === 0) {
      console.log(`✓ Pushed to ${remote}/${branch}`);
      return true;
    } else {
      console.log(`✗ Push failed: ${result.stderr}`);
      return false;
    }
  }

  getUncommittedChanges(): {
    staged: string[];
    modified: string[];
    untracked: string[];
  } {
    // Get staged files
    const stagedResult = this.runGitCommand(['diff', '--cached', '--name-only']);
    const staged = stagedResult.stdout.split('\n').filter(f => f);

    // Get modified files
    const modifiedResult = this.runGitCommand(['diff', '--name-only']);
    const modified = modifiedResult.stdout.split('\n').filter(f => f);

    // Get untracked files
    const untrackedResult = this.runGitCommand(['ls-files', '--others', '--exclude-standard']);
    const untracked = untrackedResult.stdout.split('\n').filter(f => f);

    return { staged, modified, untracked };
  }

  createPullRequestInfo(branch: string, apis: string[]): {
    title: string;
    body: string;
    branch: string;
  } {
    const title = `Add API integrations: ${apis.join(', ')}`;
    
    const body = `## API Integrations Added

This pull request adds integration modules for the following APIs:
${apis.map(api => `- ${api}`).join('\n')}

### Files Changed
- New integration modules in \`integrations/\` directory
- Environment configuration in \`.env.example\`
- Additional dependencies in package.json

### Setup Instructions
1. Copy \`.env.example\` to \`.env\`
2. Add your API keys to \`.env\`
3. Install new dependencies with \`npm install\`
4. Run the integration demo

### Generated by
Codebase API Integrator (TypeScript) - ${new Date().toISOString()}
`;

    return { title, body, branch };
  }
}

export class InteractiveGitWorkflow {
  private repoPath: string;
  private integrationPlan: IntegrationPlan;
  private git: GitIntegration;
  private rl: readline.Interface;

  constructor(repoPath: string, integrationPlan: IntegrationPlan) {
    this.repoPath = repoPath;
    this.integrationPlan = integrationPlan;
    this.git = new GitIntegration(repoPath);
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  showChangesSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📋 INTEGRATION CHANGES SUMMARY');
    console.log('='.repeat(60));

    const changes = this.integrationPlan.changes || [];
    console.log(`\n📁 Files to be created/modified (${changes.length}):`);
    
    for (let i = 0; i < Math.min(10, changes.length); i++) {
      const change = changes[i];
      const status = change.original === undefined ? 'CREATE' : 'MODIFY';
      console.log(`  [${status}] ${change.path} - ${change.description}`);
    }

    if (changes.length > 10) {
      console.log(`  ... and ${changes.length - 10} more files`);
    }

    const deps = this.integrationPlan.npmDependencies || this.integrationPlan.pip_dependencies || [];
    if (deps.length > 0) {
      console.log(`\n📦 Dependencies to add (${deps.length}):`);
      deps.slice(0, 5).forEach(dep => console.log(`  - ${dep}`));
      if (deps.length > 5) {
        console.log(`  ... and ${deps.length - 5} more`);
      }
    }

    const envVars = this.integrationPlan.envPlaceholders || this.integrationPlan.env_placeholders || {};
    const envKeys = Object.keys(envVars);
    if (envKeys.length > 0) {
      console.log(`\n🔐 Environment variables (${envKeys.length}):`);
      envKeys.slice(0, 5).forEach(key => console.log(`  - ${key}`));
      if (envKeys.length > 5) {
        console.log(`  ... and ${envKeys.length - 5} more`);
      }
    }
  }

  async getUserApproval(): Promise<boolean> {
    console.log('\n' + '='.repeat(60));
    console.log('🤔 REVIEW AND APPROVE');
    console.log('='.repeat(60));

    console.log('\nWould you like to:');
    console.log('  1. 👍 Approve and commit these changes');
    console.log('  2. 👀 Review the changes in detail');
    console.log('  3. ✏️  Commit with a custom message');
    console.log('  4. 🚫 Cancel (don\'t commit)');

    const choice = await this.question('\nYour choice (1-4): ');

    switch (choice.trim()) {
      case '1':
        return true;
      case '2':
        await this.showDetailedChanges();
        return this.getUserApproval();
      case '3':
        const customMessage = await this.getCustomCommitMessage();
        if (customMessage) {
          this.integrationPlan.commitMessage = customMessage;
          return true;
        }
        return false;
      case '4':
        console.log('❌ Commit cancelled');
        return false;
      default:
        console.log('Invalid choice, please try again');
        return this.getUserApproval();
    }
  }

  private async question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(prompt, (answer) => {
        resolve(answer);
      });
    });
  }

  private async showDetailedChanges(): Promise<void> {
    const changes = this.integrationPlan.changes || [];
    
    for (let i = 0; i < changes.length; i++) {
      const change = changes[i];
      console.log(`\n--- File ${i + 1}/${changes.length}: ${change.path} ---`);
      const content = change.updated.substring(0, 500);
      console.log(content);
      if (change.updated.length > 500) {
        console.log('... (truncated)');
      }

      if ((i + 1) % 3 === 0 && i < changes.length - 1) {
        const cont = await this.question('\nPress Enter to continue or \'q\' to stop: ');
        if (cont.toLowerCase() === 'q') {
          break;
        }
      }
    }
  }

  private async getCustomCommitMessage(): Promise<string> {
    console.log('\nEnter your commit message:');
    const message = await this.question('> ');
    return message.trim() || this.generateDefaultMessage();
  }

  private generateDefaultMessage(): string {
    const apis = this.integrationPlan.apis || [];
    if (apis.length > 0) {
      return `Add API integrations for ${apis.join(', ')}`;
    }
    return 'Add API integrations';
  }

  async commitAndPush(pushToRemote: boolean = true, branchName?: string): Promise<boolean> {
    try {
      // Create branch
      if (!branchName) {
        branchName = this.git.createIntegrationBranch();
      }

      console.log(`\n🔀 Working on branch: ${branchName}`);

      // Add files
      console.log('\n📝 Adding files to git...');
      const filesToAdd = this.integrationPlan.changes.map(c => c.path);
      this.git.addFiles(filesToAdd);

      // Also add config files if they exist
      const additionalFiles = ['.env.example', 'package_additions.json', 'INTEGRATION_NOTES.md', 'SETUP.md'];
      const existingAdditional = additionalFiles.filter(f => 
        fs.existsSync(path.join(this.repoPath, f))
      );
      if (existingAdditional.length > 0) {
        this.git.addFiles(existingAdditional);
      }

      // Commit
      const message = (this.integrationPlan as any).commitMessage || this.generateDefaultMessage();
      console.log(`\n💾 Committing with message: ${message}`);
      const commitHash = this.git.commitChanges(message);
      console.log(`✓ Commit created: ${commitHash.substring(0, 8)}`);

      // Push if requested
      if (pushToRemote) {
        console.log('\n🚀 Pushing to remote...');
        if (this.git.pushChanges(branchName)) {
          console.log(`✓ Successfully pushed to origin/${branchName}`);

          // Generate PR info
          const prInfo = this.git.createPullRequestInfo(
            branchName,
            this.integrationPlan.apis || []
          );

          console.log('\n' + '='.repeat(60));
          console.log('📢 PULL REQUEST INFORMATION');
          console.log('='.repeat(60));
          console.log(`\nTitle: ${prInfo.title}`);
          console.log(`\nBody:\n${prInfo.body}`);
          console.log(`\nBranch: ${prInfo.branch}`);
          console.log('\n✨ You can now create a pull request on GitHub!');
        } else {
          console.log('⚠️  Push failed - changes are committed locally');
          console.log(`You can push manually with: git push origin ${branchName}`);
        }
      }

      this.rl.close();
      return true;

    } catch (error) {
      console.error(`❌ Error during commit: ${error}`);
      this.rl.close();
      return false;
    }
  }

  close(): void {
    this.rl.close();
  }
}

// Export for use in other modules
export default { GitIntegration, InteractiveGitWorkflow };