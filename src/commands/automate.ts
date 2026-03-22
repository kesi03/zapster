import yargs from 'yargs';
import * as fs from 'fs';
import * as yaml from 'yaml';
import * as path from 'path';
import Docker from 'dockerode';
import tar from 'tar-fs';
import { ZapClient } from '../zap/ZapClient';
import { initLoggerWithWorkspace, getWorkspacePath, ensureWorkspace } from '../utils/workspace';
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

async function createContainerDirectory(containerId: string, dirPath: string): Promise<void> {
  const container = docker.getContainer(containerId);
  
  const mkdirExec = await container.exec({
    Cmd: ['mkdir', '-p', dirPath],
    AttachStdout: true,
    AttachStderr: true,
  });
  const mkdirStream = await mkdirExec.start({ hijack: true, stdin: false });
  await new Promise<void>((resolve) => {
    mkdirStream.on('end', resolve);
    mkdirStream.on('error', resolve);
  });
}

async function downloadFromContainer(containerId: string, containerPath: string, outputDir: string): Promise<string[]> {
  const container = docker.getContainer(containerId);
  const downloadedFiles: string[] = [];

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    log.info(`Downloading from container: ${containerPath}`);
    const tarStream = await container.getArchive({ path: containerPath });

    await new Promise<void>((resolve, reject) => {
      const extractor = tar.extract(outputDir);
      tarStream.pipe(extractor);
      extractor.on('finish', resolve);
      extractor.on('error', reject);
    });

    const files = fs.readdirSync(outputDir);
    downloadedFiles.push(...files.map(f => path.join(outputDir, f)));
    log.success(`Downloaded ${files.length} files from ${containerPath}`);
  } catch (error: any) {
    if (error.statusCode === 404) {
      log.warn(`Path not found in container: ${containerPath}`);
    } else {
      log.error(`Failed to download from container: ${error.message}`);
    }
  }

  return downloadedFiles;
}

async function downloadSingleFile(containerId: string, containerFilePath: string, outputDir: string): Promise<string | null> {
  const container = docker.getContainer(containerId);
  const filename = path.basename(containerFilePath);
  const parentDir = path.dirname(containerFilePath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    log.info(`Downloading file: ${containerFilePath}`);
    const tarStream = await container.getArchive({ path: parentDir });

    await new Promise<void>((resolve, reject) => {
      const extractor = tar.extract(outputDir);
      tarStream.pipe(extractor);
      extractor.on('finish', resolve);
      extractor.on('error', reject);
    });

    const downloadedPath = path.join(outputDir, filename);
    if (fs.existsSync(downloadedPath)) {
      log.success(`Downloaded: ${filename} -> ${downloadedPath}`);
      return downloadedPath;
    } else {
      log.warn(`File not found after download: ${filename}`);
      return null;
    }
  } catch (error: any) {
    if (error.statusCode === 404) {
      log.warn(`Path not found in container: ${parentDir}`);
    } else {
      log.error(`Failed to download file: ${error.message}`);
    }
    return null;
  }
}

async function getContainerLogs(containerId: string, tail: number = 100): Promise<string> {
  const container = docker.getContainer(containerId);
  const logsBuffer = await container.logs({
    stdout: true,
    stderr: true,
    tail,
    timestamps: true,
    follow: false,
  });

  const logs = logsBuffer.toString('utf-8');
  return logs;
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
      log.info(`Jobs: ${expectedJobs.join(' -> ')}`);

      const jobProgress: Record<string, { progress: number; bar?: any; finished: boolean }> = {};
      for (const job of expectedJobs) {
        jobProgress[job] = { progress: 0, finished: false };
      }
      const reportPaths: string[] = [];

      let planPath = planFile;
      const containerArg = argv.container as string | undefined;
      const imageArg = argv.image as string | undefined;
      let resolvedContainerId: string | undefined;

      if (containerArg || imageArg) {
        if (containerArg) {
          resolvedContainerId = containerArg;
        } else if (imageArg) {
          log.info(`Finding container with image: ${imageArg}`);
          const containerInfo = await findContainerByImage(imageArg);
          if (!containerInfo) {
            log.error(`No container found with image: ${imageArg}`);
            process.exit(1);
          }
          resolvedContainerId = containerInfo.Id;
          log.info(`Found container: ${containerInfo.Names[0] || resolvedContainerId.substring(0, 12)}`);
        }

        const containerPath = await copyFileToContainer(resolvedContainerId!, planFile);
        log.info(`Copied plan to container: ${containerPath}`);
        planPath = containerPath;

        const reportJob = (plan.jobs || []).find((j: any) => j.type === 'report');
        const reportDir = reportJob?.parameters?.reportDir || 'zap-results';
        const containerReportDir = `/home/zap/config/examples/${reportDir}`;
        log.info(`Creating report directory in container: ${containerReportDir}`);
        await createContainerDirectory(resolvedContainerId!, containerReportDir);
      } else {
        log.info('No container specified - using local file path');
      }

      const planId = await zap.automation.runPlan(planPath);
      log.info(`Plan started with ID: ${planId}`);

      const overallBar = createProgressBar('Overall |{bar}| {percentage}% | {jobs}');
      updateProgress(overallBar, 0, { jobs: 'Starting...' });

      let lastProcessedIndex = -1;
      let currentJobType = '';
      let done = false;

      while (!done) {
        const progress = await zap.automation.planProgress(planId);
        
        if (progress.error?.length) {
          log.error(`Plan errors: ${progress.error.join(', ')}`);
        }
        
        if (progress.info) {
          for (let i = lastProcessedIndex + 1; i < progress.info.length; i++) {
            const msg = progress.info[i];

            const startedMatch = msg.match(/^Job (\S+) started$/);
            if (startedMatch) {
              currentJobType = startedMatch[1];
              log.info(`[${currentJobType}] Started`);
              
              if (jobProgress[currentJobType] && !jobProgress[currentJobType].bar) {
                jobProgress[currentJobType].bar = createProgressBar(`${currentJobType} |{bar}| {percentage}%`);
                jobProgress[currentJobType].progress = 0;
                updateProgress(jobProgress[currentJobType].bar, 0, {});
              }
            }

            const finishedMatch = msg.match(/^Job (\S+) finished, time taken: (.+)$/);
            if (finishedMatch) {
              const finishedJob = finishedMatch[1];
              const timeTaken = finishedMatch[2];
              jobProgress[finishedJob].finished = true;
              
              if (jobProgress[finishedJob].bar) {
                stopProgress(jobProgress[finishedJob].bar);
              }
              
              log.success(`[${finishedJob}] Finished (${timeTaken})`);
              currentJobType = '';
            }

            const reportMatch = msg.match(/generated report (.+)$/);
            if (reportMatch) {
              const reportPath = reportMatch[1];
              reportPaths.push(reportPath);
              log.info(`[report] Generated: ${reportPath}`);
            }

            lastProcessedIndex = i;
          }
        }

        if (currentJobType === 'spider') {
          try {
            const stats = await zap.core.getAllStats();
            const urlsFound = stats['stats.spider.url.found'] || 0;
            const urlsProcessed = stats['stats.spider.urls.processed'] || 0;
            const progress = urlsFound > 0 ? Math.min(99, Math.round((urlsProcessed / urlsFound) * 100)) : 0;
            
            if (progress > 0 && progress !== jobProgress[currentJobType]?.progress) {
              log.info(`[spider] ${progress}% (${urlsProcessed}/${urlsFound} URLs)`);
              jobProgress[currentJobType].progress = progress;
            }
            if (jobProgress[currentJobType]?.bar) {
              updateProgress(jobProgress[currentJobType].bar, progress, { urls: urlsProcessed });
            }
          } catch {
            // Stats may not be available yet
          }
        } else if (currentJobType === 'spiderAjax') {
          try {
            const ajaxStatus = await zap.ajaxSpider.ajaxSpiderStatus();
            const stats = await zap.core.getAllStats();
            const urlsFound = stats['spiderAjax.urls.added'] || ajaxStatus.nodesVisited || 0;
            const isRunning = ajaxStatus.status === 'RUNNING';
            const progress = ajaxStatus.status === 'FINISHED' ? 100 : isRunning ? 50 : 0;
            
            if (isRunning && urlsFound > 0 && urlsFound !== jobProgress[currentJobType]?.progress) {
              log.info(`[spiderAjax] ${urlsFound} URLs found`);
              jobProgress[currentJobType].progress = urlsFound;
            }
            if (jobProgress[currentJobType]?.bar) {
              updateProgress(jobProgress[currentJobType].bar, progress, { urls: urlsFound });
            }
          } catch {
            // Ignore
          }
        } else if (currentJobType === 'activeScan') {
          try {
            const stats = await zap.core.getAllStats();
            const urlsScanned = stats['stats.ascan.urls'] || 0;
            
            const scans = await zap.ascan.activeScanStatus();
            let activeScanProgress = 0;
            
            if (Array.isArray(scans) && scans.length > 0) {
              activeScanProgress = scans[0].progress;
            }
            
            if (activeScanProgress > 0 && activeScanProgress !== jobProgress[currentJobType]?.progress) {
              log.info(`[activeScan] ${activeScanProgress}% (${urlsScanned} URLs)`);
              jobProgress[currentJobType].progress = activeScanProgress;
            }
            
            if (activeScanProgress > 0) {
              updateProgress(jobProgress[currentJobType].bar, activeScanProgress, { scanned: urlsScanned });
            } else if (urlsScanned > 0) {
              updateProgress(jobProgress[currentJobType].bar, 50, { scanned: urlsScanned });
            }
          } catch {
            // Ignore
          }
        } else if (currentJobType === 'passiveScan-config') {
          if (jobProgress[currentJobType]?.bar) {
            updateProgress(jobProgress[currentJobType].bar, 100, {});
          }
        } else if (currentJobType === 'report') {
          if (jobProgress[currentJobType]?.bar) {
            updateProgress(jobProgress[currentJobType].bar, 50, {});
          }
        }

        if (progress.finished) {
          done = true;
          break;
        }

        const completedCount = Object.values(jobProgress).filter(j => j.finished).length;
        const overallPct = Math.round((completedCount / expectedJobs.length) * 100);
        updateProgress(overallBar, overallPct, { jobs: currentJobType || 'Complete' });

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      stopProgress(overallBar);

      for (const job of expectedJobs) {
        if (!jobProgress[job]?.finished) {
          log.warn(`Job not completed: ${job}`);
        }
      }

      log.success('Automation plan completed successfully!');

      if (resolvedContainerId) {
        const containerId = resolvedContainerId;

        const localDir = getWorkspacePath('reports');
        if (!fs.existsSync(localDir)) {
          fs.mkdirSync(localDir, { recursive: true });
        }
        log.info(`Reports will be saved to: ${localDir}`);

        const reportJob = (plan.jobs || []).find((j: any) => j.type === 'report');
        const reportDir = reportJob?.parameters?.reportDir || 'zap-results';

        const basePaths = [
          `/home/zap/config/examples/${reportDir}`,
          `/home/zap/config/examples`,
          `/zap/wrk/${reportDir}`,
          `/zap/wrk`,
        ];

        log.info(`Searching for reports in container...`);
        const allDownloadedFiles: string[] = [];
        for (const containerPath of basePaths) {
          log.info(`Checking: ${containerPath}`);
          const reports = await downloadFromContainer(containerId, containerPath, localDir);
          if (reports.length > 0) {
            allDownloadedFiles.push(...reports);
          }
        }
        
        if (allDownloadedFiles.length > 0) {
          const uniqueFiles = [...new Set(allDownloadedFiles.map(f => path.basename(f)))];
          log.success(`Downloaded ${uniqueFiles.length} report(s): ${uniqueFiles.join(', ')}`);
        } else {
          log.warn('No reports found in container');
        }
      }

      log.success('Automation plan completed successfully!');

    } catch (error: any) {
      log.error(`Error: ${error.message}`);
      process.exit(1);
    }
  },
};
