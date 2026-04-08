import yargs from 'yargs';
import * as fs from 'fs';
import * as yaml from 'yaml';
import * as path from 'path';
import Docker from 'dockerode';
import tar from 'tar-fs';
import { ZapClient } from '../../zap/ZapClient';
import { initLoggerWithWorkspace, getWorkspacePath } from '../../utils/workspace';
import { log } from '../../utils/logger';
import { runAutomationWithProgress } from './automate';

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

export const dockerAutomateSubCommand: yargs.CommandModule = {
  command: 'docker',
  describe: 'Run ZAP automation against a ZAP daemon running in Docker',
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
        demandOption: true,
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

    const containerArg = argv.container as string;
    const imageArg = argv.image as string | undefined;
    let resolvedContainerId: string;

    if (containerArg) {
      resolvedContainerId = containerArg;
      log.info(`Using container: ${resolvedContainerId}`);
    } else if (imageArg) {
      log.info(`Finding container with image: ${imageArg}`);
      const containerInfo = await findContainerByImage(imageArg);
      if (!containerInfo) {
        log.error(`No container found with image: ${imageArg}`);
        process.exit(1);
      }
      resolvedContainerId = containerInfo.Id;
      log.info(`Found container: ${containerInfo.Names[0] || resolvedContainerId.substring(0, 12)}`);
    } else {
      log.error('Container ID/name or image is required. Use --container or --image');
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

      const containerPath = await copyFileToContainer(resolvedContainerId, planFile);
      log.info(`Copied plan to container: ${containerPath}`);

      const reportJob = (plan.jobs || []).find((j: any) => j.type === 'report');
      const reportDir = reportJob?.parameters?.reportDir || 'zap-results';
      const containerReportDir = `/home/zap/config/examples/${reportDir}`;
      log.info(`Creating report directory in container: ${containerReportDir}`);
      await createContainerDirectory(resolvedContainerId, containerReportDir);

      const planId = await zap.automation.runPlan(containerPath);
      log.info(`Plan started with ID: ${planId}`);

      const reportPaths = await runAutomationWithProgress(zap, planId, expectedJobs);

      log.success('Automation plan completed successfully!');

      const localDir = getWorkspacePath('reports');
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }
      log.info(`Reports will be saved to: ${localDir}`);

      const downloadedFiles: string[] = [];

      if (reportPaths.length > 0) {
        log.info(`Downloading ${reportPaths.length} report file(s)...`);
        for (const reportPath of reportPaths) {
          const result = await downloadSingleFile(resolvedContainerId, reportPath, localDir);
          if (result) {
            downloadedFiles.push(result);
          }
        }
      }

      if (downloadedFiles.length === 0) {
        const basePaths = [
          `/home/zap/config/examples/${reportDir}`,
          `/home/zap/config/examples`,
          `/zap/wrk/${reportDir}`,
          `/zap/wrk`,
        ];

        log.info(`Searching for reports in container...`);
        for (const containerPath of basePaths) {
          log.info(`Checking: ${containerPath}`);
          const reports = await downloadFromContainer(resolvedContainerId, containerPath, localDir);
          if (reports.length > 0) {
            downloadedFiles.push(...reports);
          }
        }
      }

      if (downloadedFiles.length > 0) {
        const uniqueFiles = [...new Set(downloadedFiles.map((f: string) => path.basename(f)))];
        log.success(`Downloaded ${uniqueFiles.length} report(s): ${uniqueFiles.join(', ')}`);
      } else {
        log.warn('No reports found in container');
      }

      log.success('Automation plan completed successfully!');

    } catch (error: any) {
      log.error(`Error: ${error.message}`);
      process.exit(1);
    }
  },
};
