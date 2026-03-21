import yargs from 'yargs';
import * as fs from 'fs';
import * as yaml from 'yaml';
import * as path from 'path';
import Docker from 'dockerode';
import tar from 'tar-fs';
import { ZapClient } from '../zap/ZapClient';
import { initLoggerWithWorkspace, getWorkspacePath } from '../utils/workspace';
import { log } from '../utils/logger';
import { createProgressBar, updateProgress, stopProgress } from '../utils/progress';

const docker = new Docker();

async function findContainerByImage(imageName: string): Promise<Docker.ContainerInfo | null> {
  const containers = await docker.listContainers({ all: true });
  return containers.find(c => 
    c.Image === imageName || 
    c.Image.startsWith(imageName)
  ) || null;
}

async function copyFileToContainer(containerId: string, hostFilePath: string): Promise<string> {
  const containerPath = '/home/zap/config/examples';
  const filename = path.basename(hostFilePath);

  const tarStream = tar.pack(path.dirname(hostFilePath), {
    entries: [filename],
  });

  const container = docker.getContainer(containerId);
  await container.putArchive(tarStream, { path: containerPath });

  return `${containerPath}/${filename}`;
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
        description: 'Docker container name or ID',
      })
      .option('image', {
        alias: 'i',
        type: 'string',
        description: 'Docker image name to find container by',
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
      const containerArg = argv.container as string | undefined;
      const imageArg = argv.image as string | undefined;

      if (containerArg || imageArg) {
        let containerId = containerArg;
        
        if (!containerId && imageArg) {
          log.info(`Finding container with image: ${imageArg}`);
          const containerInfo = await findContainerByImage(imageArg);
          if (!containerInfo) {
            log.error(`No container found with image: ${imageArg}`);
            process.exit(1);
          }
          containerId = containerInfo.Id;
          log.info(`Found container: ${containerInfo.Names[0] || containerId.substring(0, 12)}`);
        }

        const containerPath = await copyFileToContainer(containerId!, planFile);
        log.info(`Copied plan to container: ${containerPath}`);
        planPath = containerPath;
      } else {
        log.info('No container specified - using local file path');
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
