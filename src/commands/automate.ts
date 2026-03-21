import yargs from 'yargs';
import * as fs from 'fs';
import * as yaml from 'yaml';
import * as path from 'path';
import { execSync } from 'child_process';
import { ZapClient } from '../zap/ZapClient';
import { initLoggerWithWorkspace, getWorkspacePath } from '../utils/workspace';
import { log } from '../utils/logger';
import { createProgressBar, updateProgress, stopProgress } from '../utils/progress';

function findContainerByPort(port: number): string | null {
  try {
    const result = execSync(`docker ps --filter "expose=${port}" --format "{{.ID}}"`, { encoding: 'utf-8' });
    return result.trim() || null;
  } catch {
    return null;
  }
}

function copyFileToContainer(containerId: string, hostFilePath: string): string {
  const containerPath = `/zap/automation/${path.basename(hostFilePath)}`;
  try {
    execSync(`docker cp "${hostFilePath}" ${containerId}:${containerPath}`, { stdio: 'pipe' });
    return containerPath;
  } catch (error: any) {
    throw new Error(`Failed to copy file to container: ${error.message}`);
  }
}

export const automateCommand: yargs.CommandModule = {
  command: 'automate',
  describe: 'Run ZAP automation using a YAML plan file',
  builder: (yargs) => {
    return yargs
      .option('file', {
        alias: 'f',
        type: 'string',
        description: 'Path to the ZAP automation plan YAML file',
        demandOption: true,
      })
      .option('workspace', {
        alias: 'w',
        type: 'string',
        description: 'Workspace directory for outputs',
      })
      .option('container', {
        alias: 'c',
        type: 'string',
        description: 'Docker container name/ID (auto-detected from port if not provided)',
      });
  },
  handler: async (argv) => {
    initLoggerWithWorkspace();
    const planFile = argv.file as string;

    if (!planFile) {
      log.error('Plan file is required. Use --file or --f');
      process.exit(1);
    }

    if (!fs.existsSync(planFile)) {
      log.error(`Plan file not found: ${planFile}`);
      process.exit(1);
    }

    const zap = new ZapClient({
      host: argv.host as string,
      port: argv.port as number,
      apiKey: argv.apiKey as string | undefined,
    });

    try {
      const planContent = fs.readFileSync(planFile, 'utf-8');
      const plan = yaml.parse(planContent);

      log.info(`Running ZAP Automation Plan: ${plan.name || planFile}`);
      log.info(`Plan file: ${planFile}`);

      const version = await zap.core.getVersion();
      log.success(`Connected to ZAP version: ${version}`);

      const progressBar = createProgressBar('Automation |{bar}| {percentage}% | Job: {job}');
      updateProgress(progressBar, 0, { job: 'Starting...' });

      let planPath = planFile;
      const port = (argv.port as number) || 8080;
      const containerName = argv.container as string | undefined;

      if (!containerName) {
        log.info(`Auto-detecting container for port ${port}...`);
        const detected = findContainerByPort(port);
        if (detected) {
          log.success(`Found container: ${detected}`);
          const containerPath = copyFileToContainer(detected, planFile);
          log.info(`Copied plan to container: ${containerPath}`);
          planPath = containerPath;
        } else {
          log.warn('No container found - assuming file path is accessible inside container');
        }
      } else {
        const containerPath = copyFileToContainer(containerName, planFile);
        log.info(`Copied plan to container: ${containerPath}`);
        planPath = containerPath;
      }

      await zap.automation.runPlan(planPath);

      let done = false;
      let lastProgress = 0;

      while (!done) {
        const progress = await zap.automation.planProgress();
        
        const jobManager = progress.jobManager || 'unknown';
        const jobThreads = progress.jobThreads || [];
        
        const totalJobs = jobThreads.length;
        const completedJobs = jobThreads.filter((j: any) => j.currentState === 'FINISHED').length;
        const currentJob = jobThreads.find((j: any) => j.currentState === 'RUNNING');
        
        const progressPercent = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : lastProgress;
        lastProgress = progressPercent;

        const jobName = currentJob?.type || jobManager;
        updateProgress(progressBar, Math.min(progressPercent, 99), { job: jobName });

        if (totalJobs > 0 && completedJobs >= totalJobs) {
          done = true;
        } else if (jobThreads.length === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      stopProgress(progressBar);
      updateProgress(progressBar, 100, { job: 'Complete!' });

      log.success('Automation plan completed successfully!');

    } catch (error: any) {
      log.error(`Error: ${error.message}`);
      process.exit(1);
    }
  },
};
