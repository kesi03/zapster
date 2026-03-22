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

  const container = docker.getContainer(containerId);

  const mkdirExec = await container.exec({
    Cmd: ['mkdir', '-p', containerPath],
    AttachStdout: true,
    AttachStderr: true,
  });
  const mkdirStream = await mkdirExec.start({ hijack: true, stdin: false });
  await new Promise<void>((resolve) => {
    mkdirStream.on('end', resolve);
    mkdirStream.on('error', resolve);
  });

  const tarStream = tar.pack(path.dirname(hostFilePath), {
    entries: [filename],
  });

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

      const expectedJobs = (plan.jobs || []).map((job: any) => job.type);
      log.info(`Expected jobs: ${expectedJobs.join(', ')}`);

      const completedJobs = new Set<string>();
      let currentJob = 'Initializing...';

      const progressBar = createProgressBar('Automation |{bar}| {percentage}% | {job}');
      updateProgress(progressBar, 0, { job: currentJob });

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

      const planId = await zap.automation.runPlan(planPath);
      log.info(`Plan started with ID: ${planId}`);

      let done = false;
      let iterations = 0;

      while (!done) {
        const progress = await zap.automation.planProgress(planId);
        
        if (progress.error?.length) {
          log.error(`Plan errors: ${progress.error.join(', ')}`);
        }
        
        if (progress.info) {
          for (const msg of progress.info) {
            const startedMatch = msg.match(/^Job (\S+) started$/);
            if (startedMatch) {
              currentJob = startedMatch[1];
            }

            for (const jobType of expectedJobs) {
              if (msg.includes(`Job ${jobType} finished`)) {
                completedJobs.add(jobType);
              }
            }
          }
        }
        
        if (progress.finished) {
          console.log(JSON.stringify(progress, null, 2));
          break;
        }
        
        if (iterations % 10 === 0 && progress.info?.length) {
          log.info(`Info: ${progress.info.join(', ')}`);
        }
        
        const percentage = expectedJobs.length > 0 
          ? Math.round((completedJobs.size / expectedJobs.length) * 100) 
          : 0;
        iterations++;

        updateProgress(progressBar, Math.min(percentage, 99), { job: currentJob });

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      for (const job of expectedJobs) {
        if (!completedJobs.has(job)) {
          log.warn(`Job not completed: ${job}`);
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
