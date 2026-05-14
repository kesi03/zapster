import yargs from 'yargs';
import Docker from 'dockerode';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as yaml from 'yaml';
import tar from 'tar-fs';
import axios from 'axios';
import * as toml from '@iarna/toml';
import { log } from '../../utils/logger';
import { DEFAULT_JAVA_OPTIONS } from '../../utils/constants';
import { DockerTomlConfig } from './daemon';
import { ZapClient } from '../../zap/ZapClient';
import { runAutomationWithProgress } from '../zap/automate';

const docker = new Docker();

interface DockerAutorunArgs {
  toml?: string;
  plan?: string;
  image?: string;
  port?: number;
  host?: string;
  apiKey?: string;
  debug?: boolean;
  network?: string;
  name?: string;
  timeoutMins?: number;
  maxResponseSize?: number;
  javaOptions?: string;
  dbCacheSize?: number;
  dbRecoveryLog?: boolean;
  workspace?: string;
}

async function waitForZapReady(port: number, apiKey: string, maxAttempts: number = 30): Promise<void> {
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      await axios.get(`http://localhost:${port}/JSON/core/view/version/`, {
        headers: { 'X-ZAP-API-Key': apiKey },
        timeout: 5000,
      });
      log.info('ZAP daemon is ready');
      return;
    } catch {
      log.info(`Waiting for ZAP API... (${i}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  throw new Error('ZAP daemon failed to become ready within timeout');
}

async function copyFileToContainer(containerId: string, hostFilePath: string, containerDir: string): Promise<string> {
  const filename = path.basename(hostFilePath);
  const container = docker.getContainer(containerId);

  const mkdirExec = await container.exec({
    Cmd: ['mkdir', '-p', containerDir],
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

  await container.putArchive(tarStream, { path: containerDir });

  return `${containerDir}/${filename}`;
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

export const autorunDockerCommand: yargs.CommandModule = {
  command: 'autorun',
  describe: 'Start ZAP daemon in Docker and run an automation plan once ready',
  builder: (yargs) => {
    return yargs
      .option('plan', {
        alias: 'p',
        type: 'string',
        description: 'Path to ZAP automation plan YAML file',
      })
      .option('toml', {
        alias: 't',
        type: 'string',
        description: 'Path to zap-docker.toml configuration file',
      })
      .option('image', {
        alias: 'i',
        type: 'string',
        default: 'ghcr.io/zaproxy/zaproxy:stable',
        description: 'ZAP Docker image to use',
      })
      .option('port', {
        alias: 'P',
        type: 'number',
        default: 8080,
        description: 'ZAP proxy port',
      })
      .option('host', {
        alias: 'H',
        type: 'string',
        default: '0.0.0.0',
        description: 'ZAP host to bind to',
      })
      .option('api-key', {
        type: 'string',
        description: 'API key for ZAP (auto-generated if not provided)',
      })
      .option('debug', {
        alias: 'd',
        type: 'boolean',
        default: false,
        description: 'Enable debug mode',
      })
      .option('network', {
        alias: 'n',
        type: 'string',
        description: 'Docker network mode or name',
      })
      .option('name', {
        alias: 'N',
        type: 'string',
        default: 'zap-daemon',
        description: 'Container name',
      })
      .option('timeout-mins', {
        type: 'number',
        default: 5,
        description: 'Minutes to wait for ZAP to start',
      })
      .option('max-response-size', {
        alias: 'M',
        type: 'number',
        default: 104857600,
        description: 'Max response body size in bytes (default 100MB)',
      })
      .option('java-options', {
        type: 'string',
        default: DEFAULT_JAVA_OPTIONS.join(' '),
        description: 'Java options (e.g. -Xmx4g)',
      })
      .option('db-cache-size', {
        type: 'number',
        default: 1000000,
        description: 'Database cache size',
      })
      .option('db-recovery-log', {
        type: 'boolean',
        default: false,
        description: 'Enable database recovery log',
      })
      .option('workspace', {
        alias: 'w',
        type: 'string',
        description: 'Workspace directory for outputs',
      });
  },
  handler: async (argv) => {
    const args = argv as unknown as DockerAutorunArgs;

    let config: DockerTomlConfig = {};
    let useToml = false;

    if (args.toml) {
      if (!fs.existsSync(args.toml)) {
        log.error(`TOML file not found: ${args.toml}`);
        process.exit(1);
      }
      log.info(`Using TOML config: ${args.toml}`);
      const content = fs.readFileSync(args.toml, 'utf-8');
      config = toml.parse(content) as DockerTomlConfig;
      useToml = true;
    }

    let planPath: string | undefined = args.plan;

    if (!planPath && useToml && (config as any).AUTOMATION?.planPath) {
      const tomlDir = args.toml ? path.dirname(path.resolve(args.toml)) : '.';
      planPath = path.resolve(tomlDir, (config as any).AUTOMATION.planPath);
    }

    if (!planPath) {
      log.error('No plan specified. Use --plan <path> or add [AUTOMATION] planPath to your TOML config.');
      process.exit(1);
    }

    const planFilePath = path.isAbsolute(planPath) ? planPath : path.resolve(process.cwd(), planPath);
    if (!fs.existsSync(planFilePath)) {
      log.error(`Plan file not found: ${planFilePath}`);
      process.exit(1);
    }

    const dockerConfig = config.DOCKER || {};
    const zapImage = args.image || dockerConfig.IMAGE || 'ghcr.io/zaproxy/zaproxy:stable';
    const containerName = args.name || dockerConfig.NAME || 'zap-daemon';
    const apiKey = args.apiKey || Math.random().toString(36).substring(2, 18) + Date.now().toString(36);
    const port = Number(args.port) || Number(dockerConfig.PORT) || 8080;
    const host = args.host || dockerConfig.HOST || '0.0.0.0';
    const maxResponseSize = args.maxResponseSize || dockerConfig.MAX_RESPONSE_SIZE || 104857600;
    const dbCacheSize = args.dbCacheSize || dockerConfig.DB_CACHE_SIZE || 1000000;
    const dbRecoveryLog = args.dbRecoveryLog ?? dockerConfig.DB_RECOVERY_LOG ?? false;
    const timeoutMins = args.timeoutMins || dockerConfig.TIMEOUT_MINS || 5;
    const network = args.network || dockerConfig.NETWORK;
    const javaOptions = args.javaOptions || (config.JAVA_OPTIONS?.flags?.join(' ')) || DEFAULT_JAVA_OPTIONS.join(' ');

    const containerDir = '/home/zap/config/examples';

    try {
      const existing = await docker.listContainers({ all: true });
      const existingContainer = existing.find(c => c.Names.includes(`/${containerName}`));

      if (existingContainer) {
        if (existingContainer.State === 'running') {
          log.warn(`Container ${containerName} is already running`);
        } else {
          log.info(`Removing existing stopped container ${containerName}`);
          const container = docker.getContainer(existingContainer.Id);
          await container.remove({ force: true });
        }
      }

      log.info(`Pulling ZAP Docker image: ${zapImage}`);
      await new Promise<void>((resolve, reject) => {
        docker.pull(zapImage, (err: any, stream: NodeJS.ReadableStream) => {
          if (err) {
            log.warn(`Could not pull image: ${err.message}, trying to use local image`);
            resolve();
            return;
          }

          docker.modem.followProgress(stream, (err: any) => {
            if (err) {
              log.warn(`Error during pull: ${err.message}, trying to use local image`);
            }
            resolve();
          });
        });
      });

      const configFlags = [
        `api.key=${apiKey}`,
        'api.addrs.addr.name=.*',
        'api.addrs.addr.regex=true',
        `database.response.bodysize=${maxResponseSize}`,
        `database.cache.size=${dbCacheSize}`,
        `database.recoverylog=${dbRecoveryLog ? 'true' : 'false'}`,
      ];

      const zapCmd = [
        'zap.sh', '-daemon',
        '-host', host,
        '-port', `${port}`,
        ...configFlags.flatMap(f => ['-config', f]),
      ];

      if (args.debug) {
        zapCmd.push('-d');
      }

      const createOptions: Docker.ContainerCreateOptions = {
        name: containerName,
        Image: zapImage,
        ExposedPorts: {
          [`${port}/tcp`]: {},
        },
        HostConfig: {
          PortBindings: {
            [`${port}/tcp`]: [{ HostPort: String(port) }],
          },
          ExtraHosts: ['host.docker.internal:host-gateway'],
          AutoRemove: false,
        },
        Cmd: zapCmd,
        Env: [
          `_JAVA_OPTIONS=${javaOptions}`,
          `ZAP_API_KEY=${apiKey}`,
        ],
      };

      if (network && network !== 'host') {
        (createOptions.HostConfig as any).NetworkMode = network;
      }

      log.info(`Creating container ${containerName} with port=${port}...`);
      const container = await docker.createContainer(createOptions);
      await container.start();

      log.info('Waiting for ZAP API to respond...');
      const maxAttempts = timeoutMins * 20;
      await waitForZapReady(port, apiKey, maxAttempts);

      log.success('ZAP daemon is UP and running');

      const containerId = container.id;

      const containerPlanPath = await copyFileToContainer(containerId, planFilePath, containerDir);
      log.info(`Copied plan to container: ${containerPlanPath}`);

      const planContent = fs.readFileSync(planFilePath, 'utf-8');
      const plan = yaml.parse(planContent);
      const expectedJobs = (plan.jobs || []).map((job: any) => job.type);

      log.info(`Running automation plan with jobs: ${expectedJobs.join(' -> ')}`);

      const reportJob = (plan.jobs || []).find((j: any) => j.type === 'report');
      const reportDir = reportJob?.parameters?.reportDir || 'zap-results';
      const containerReportDir = `${containerDir}/${reportDir}`;
      log.info(`Creating report directory in container: ${containerReportDir}`);
      await createContainerDirectory(containerId, containerReportDir);

      const zap = new ZapClient({
        host: 'localhost',
        port,
        apiKey: apiKey || undefined,
      });

      const version = await zap.core.getVersion();
      log.info(`Connected to ZAP version: ${version}`);

      const planId = await zap.automation.runPlan(containerPlanPath);
      log.info(`Plan started with ID: ${planId}`);

      const reportPaths = await runAutomationWithProgress(zap, planId, expectedJobs);

      log.success('Automation plan completed successfully!');

      const workspace = args.workspace || process.env.ZAPR_WORKSPACE || '.';
      const localDir = path.isAbsolute(workspace)
        ? path.join(workspace, 'reports')
        : path.resolve(process.cwd(), workspace, 'reports');

      const downloadedFiles: string[] = [];

      if (reportPaths.length > 0) {
        log.info(`Downloading ${reportPaths.length} report file(s)...`);
        for (const reportPath of reportPaths) {
          const result = await downloadSingleFile(containerId, reportPath, localDir);
          if (result) {
            downloadedFiles.push(result);
          }
        }
      }

      if (downloadedFiles.length === 0) {
        const basePaths = [
          containerReportDir,
          containerDir,
          `/zap/wrk/${reportDir}`,
          `/zap/wrk`,
        ];

        log.info('Searching for reports in container...');
        for (const cp of basePaths) {
          log.info(`Checking: ${cp}`);
          const reports = await downloadFromContainer(containerId, cp, localDir);
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

      log.success('Docker autorun completed successfully!');
    } catch (error: any) {
      log.error(`autorun failed: ${error.message}`);
      process.exit(1);
    }
  },
};
