import yargs from 'yargs';
import Docker from 'dockerode';
import * as path from 'path';
import * as fs from 'fs';
import { log } from '../../utils/logger';
import { DEFAULT_JAVA_OPTIONS } from '../../utils/constants';
import { loadDockerConfig, resolveDockerOptions, parseDockerToml } from './dockerScan';

const docker = new Docker();

interface DockerAutomateArgs {
  toml?: string;
  file: string;
  workspace?: string;
  image?: string;
  network?: string;
  debug?: boolean;
  name?: string;
  timeoutMins?: number;
  maxResponseSize?: number;
  dbCacheSize?: number;
  dbRecoveryLog?: boolean;
  javaOptions?: string;
  apiKey?: string;
}

export const dockerAutomateCommand: yargs.CommandModule = {
  command: 'automate',
  describe: 'Run ZAP automation using a YAML plan file via Docker',
  builder: (yargs) => {
    return yargs
      .option('toml', {
        alias: 't',
        type: 'string',
        description: 'Path to zap-docker.toml configuration file',
      })
      .option('file', {
        alias: 'f',
        type: 'string',
        demandOption: true,
        description: 'Path to the ZAP automation plan YAML file',
      })
      .option('workspace', {
        alias: 'w',
        type: 'string',
        description: 'Workspace directory (default: current directory)',
      })
      .option('image', {
        alias: 'i',
        type: 'string',
        default: 'ghcr.io/zaproxy/zaproxy:stable',
        description: 'ZAP Docker image to use',
      })
      .option('network', {
        alias: 'n',
        type: 'string',
        description: 'Docker network mode or name (e.g., host, bridge, or custom network)',
      })
      .option('debug', {
        alias: 'd',
        type: 'boolean',
        default: false,
        description: 'Show debug messages',
      })
      .option('name', {
        alias: 'N',
        type: 'string',
        description: 'Container name',
      })
      .option('timeout-mins', {
        alias: 't',
        type: 'number',
        default: 30,
        description: 'Minutes to wait for automation to complete',
      })
      .option('max-response-size', {
        alias: 'M',
        type: 'number',
        default: 104857600,
        description: 'Max response body size in bytes (default 100MB)',
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
      .option('java-options', {
        type: 'string',
        default: DEFAULT_JAVA_OPTIONS.join(' '),
        description: 'Java options (e.g. -Xmx4g)',
      })
      .option('api-key', {
        type: 'string',
        description: 'ZAP API key',
      });
  },
  handler: async (argv) => {
    const args = argv as unknown as DockerAutomateArgs;

    const { config, useToml } = loadDockerConfig(args);
    const dockerOpts = resolveDockerOptions(args, config, useToml);

    const planFile = args.file;
    if (!planFile) {
      log.error('Plan file is required. Use --file or -f');
      process.exit(1);
    }

    const planFilePath = path.isAbsolute(planFile) ? planFile : path.resolve(process.cwd(), planFile);
    if (!fs.existsSync(planFilePath)) {
      log.error(`Plan file not found: ${planFilePath}`);
      process.exit(1);
    }

    const workspace = args.workspace || dockerOpts.workspace || '.';
    const hostWorkspace = path.isAbsolute(workspace)
      ? workspace
      : path.resolve(process.cwd(), workspace);

    if (!fs.existsSync(hostWorkspace)) {
      fs.mkdirSync(hostWorkspace, { recursive: true });
    }

    const zapImage = args.image || dockerOpts.image || 'ghcr.io/zaproxy/zaproxy:stable';
    const containerName = args.name || dockerOpts.name || 'zap-automate';
    const javaOptions = args.javaOptions || dockerOpts.javaOptions || DEFAULT_JAVA_OPTIONS.join(' ');
    const apiKey = args.apiKey || dockerOpts.apiKey || '';

    log.info(`Starting ZAP automation: ${containerName}`);
    log.info(`Image: ${zapImage}`);
    log.info(`Plan file: ${planFilePath}`);
    if (useToml) {
      log.info(`Config: TOML (${args.toml})`);
    }

    try {
      const existing = await docker.listContainers({ all: true });
      const existingContainer = existing.find(c => c.Names.includes(`/${containerName}`));
      
      if (existingContainer) {
        if (existingContainer.State === 'running') {
          log.info(`Removing existing running container ${containerName}`);
          const container = docker.getContainer(existingContainer.Id);
          await container.stop({ t: 0 });
          await container.remove({ force: true });
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

      const binds: string[] = [`${hostWorkspace}:/zap/wrk/:rw`];

      if (dockerOpts.volumes) {
        for (const [hostPath, containerPath] of Object.entries(dockerOpts.volumes)) {
          const resolvedHostPath = path.isAbsolute(hostPath)
            ? hostPath
            : path.resolve(process.cwd(), hostPath);
          binds.push(`${resolvedHostPath}:${containerPath}:rw`);
        }
      }

      const createOptions: Docker.ContainerCreateOptions = {
        name: containerName,
        Image: zapImage,
        Env: [
          `_JAVA_OPTIONS=${javaOptions}`,
          `ZAP_API_KEY=${apiKey}`,
        ],
        Cmd: ['zap.sh', '-cmd', '-autorun', `/zap/wrk/${path.basename(planFilePath)}`],
        HostConfig: {
          AutoRemove: true,
          Binds: binds,
          ExtraHosts: ['host.docker.internal:host-gateway'],
        },
      };

      if (dockerOpts.network && dockerOpts.network !== 'host') {
        (createOptions.HostConfig as any).NetworkMode = dockerOpts.network;
      }

      if (args.debug) {
        createOptions.Env?.push('DEBUG=true');
      }

      if (dockerOpts.maxResponseSize || dockerOpts.dbCacheSize || dockerOpts.dbRecoveryLog !== undefined) {
        const zapOpts = [
          '-config', `database.response.bodysize=${dockerOpts.maxResponseSize || 104857600}`,
          '-config', `database.cache.size=${dockerOpts.dbCacheSize || 1000000}`,
          '-config', `database.recoverylog=${dockerOpts.dbRecoveryLog ? 'true' : 'false'}`
        ];
        createOptions.Cmd = ['zap.sh', '-cmd', '-autorun', ...zapOpts, `/zap/wrk/${path.basename(planFilePath)}`];
      }

      log.info(`Creating container ${containerName}...`);
      const container = await docker.createContainer(createOptions);
      await container.start();

      const maxAttempts = dockerOpts.timeoutMins * 20;
      let lastStatus = '';
      let attempt = 0;

      while (attempt < maxAttempts) {
        const info = await container.inspect();
        
        if (!info.State.Running) {
          if (info.State.ExitCode !== 0) {
            const logs = await container.logs({ stdout: true, stderr: true });
            log.error(`Container exited with code: ${info.State.ExitCode}`);
            log.error(`Container logs:\n${logs}`);
            process.exit(1);
          }
          break;
        }

        if (info.State.Status !== lastStatus) {
          lastStatus = info.State.Status;
          log.info(`Container status: ${lastStatus}`);
        }

        await new Promise(resolve => setTimeout(resolve, 3000));
        attempt++;
      }

      const finalInfo = await container.inspect();
      if (!finalInfo.State.Running) {
        if (finalInfo.State.ExitCode === 0) {
          log.success('Automation completed successfully');
        } else {
          const logs = await container.logs({ stdout: true, stderr: true });
          log.error(`Automation failed with exit code: ${finalInfo.State.ExitCode}`);
          log.error(`Container logs:\n${logs}`);
          process.exit(1);
        }
      } else {
        log.success('Container still running, cleaning up...');
        await container.stop({ t: 0 });
      }
    } catch (error: any) {
      log.error(`Failed to run ZAP automation: ${error.message}`);
      process.exit(1);
    }
  },
};