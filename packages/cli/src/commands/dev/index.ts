import { Command } from '@oclif/core';
import { exec } from 'node:child_process';
import path from 'node:path';
import url from 'node:url';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

class DevCommand extends Command {
  async run(): Promise<void> {

    try {
      const repoRoot = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '../../'); // Adjust the path as necessary
      process.chdir(repoRoot);
      
      const { stdout } = await execAsync('docker-compose ps -q');
      
      if (stdout.trim()) {
        this.log('Docker containers are already running.');
    } else {
        this.log('Starting Docker containers...');
        const dockerUpResult = await execAsync('docker-compose up -d');
        this.log(dockerUpResult.stdout);
        this.log('Docker containers started.');
    }

      await this.runTurboDev();
    } catch (error) {
      this.error(`Error: ${error}`);
    }
  }

  private async runTurboDev(): Promise<void> {
    this.log('Running npx turbo dev...');
    try {
      const turboDevResult = await execAsync('npx turbo dev');
      this.log(turboDevResult.stdout);
    } catch (error) {
      this.error(`Error: ${error}`);
    }
  }
}

export default DevCommand;
