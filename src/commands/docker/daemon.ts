import yargs from 'yargs';
import Docker from 'dockerode';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as toml from '@iarna/toml';
import { log } from '../../utils/logger';
import { setDevOpsVariables } from '../../utils/devops';
import axios from 'axios';
import { DEFAULT_JAVA_OPTIONS } from '../../utils/constants';

export interface DockerTomlConfig {
  DOCKER?: {
    IMAGE?: string;
    PORT?: number;
    HOST?: string;
    API_PORT?: number;
    NAME?: string;
    NETWORK?: string;
    MAX_RESPONSE_SIZE?: number;
    DB_CACHE_SIZE?: number;
    DB_RECOVERY_LOG?: boolean;
    TIMEOUT_MINS?: number;
    WORKSPACE?: string;
  };
  VOLUMES?: {
    [key: string]: string;
  };
  SCAN?: {
    CONFIG_FILE?: string;
    CONFIG_URL?: string;
    GEN_FILE?: string;
    SPIDER_MINS?: number;
    REPORT_HTML?: string;
    REPORT_MD?: string;
    REPORT_XML?: string;
    REPORT_JSON?: string;
    INCLUDE_ALPHA?: boolean;
    DELAY_SECS?: number;
    DEFAULT_RULES_INFO?: boolean;
    IGNORE_WARNING?: boolean;
    AJAX_SPIDER?: boolean;
    MIN_LEVEL?: string;
    CONTEXT_FILE?: string;
    PROGRESS_FILE?: string;
    SHORT_OUTPUT?: boolean;
    USER?: string;
    ZAP_OPTIONS?: string;
    HOOK?: string;
    AUTO?: boolean;
    AUTO_OFF?: boolean;
    PLAN_ONLY?: boolean;
    SCHEMA?: string;
    HOST_OVERRIDE?: string;
    CONFIG_PATH?: string;
    API_FOLDER?: string;
    FAIL_ON_WARN?: boolean;
  };
  JAVA_OPTIONS?: {
    flags?: string[];
  };
  CONFIG?: {
    flags?: string[];
  };
}

function parseTomlConfig(tomlPath: string): DockerTomlConfig {
  const content = fs.readFileSync(tomlPath, 'utf-8');
  return toml.parse(content) as DockerTomlConfig;
}

const docker = new Docker();

interface DaemonStartArgs {
  toml?: string;
  image?: string;
  port?: number;
  host?: string;
  apiPort?: number;
  apiKey?: string;
  debug?: boolean;
  network?: string;
  name?: string;
  timeoutMins?: number;
  maxResponseSize?: number;
  javaOptions?: string;
  dbCacheSize?: number;
  dbRecoveryLog?: boolean;
}

function generateApiKey(): string {
  return Math.random().toString(36).substring(2, 18) + Date.now().toString(36);
}

async function waitForZapReady(port: number, apiKey: string, maxAttempts: number = 30): Promise<boolean> {
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      await axios.get(`http://localhost:${port}/JSON/core/view/version/`, {
        headers: { 'X-ZAP-API-Key': apiKey },
        timeout: 5000,
      });
      return true;
    } catch {
      log.info(`Waiting for ZAP API... (${i}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  return false;
}

export const startDaemonCommand: yargs.CommandModule = {
  command: 'start-daemon',
  describe: 'Start ZAP as a daemon in Docker',
  builder: (yargs) => {
    return yargs
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
      .option('api-port', {
        alias: 'A',
        type: 'number',
        default: 8080,
        description: 'ZAP API port (same as proxy by default)',
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
        alias: 't',
        type: 'number',
        default: 1,
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
      });
  },
  handler: async (argv) => {
    const args = argv as unknown as DaemonStartArgs;
    
    let config: DockerTomlConfig = {};
    let useToml = false;

    if (args.toml) {
      if (!fs.existsSync(args.toml)) {
        log.error(`TOML file not found: ${args.toml}`);
        process.exit(1);
      }
      log.info(`Using TOML config: ${args.toml}`);
      config = parseTomlConfig(args.toml);
      useToml = true;
    }

    const dockerConfig = config.DOCKER || {};
    const containerName = args.name || dockerConfig.NAME || 'zap-daemon';
    const zapImage = args.image || dockerConfig.IMAGE || 'ghcr.io/zaproxy/zaproxy:stable';
    const apiKey = args.apiKey || generateApiKey();
    const port = args.port || dockerConfig.PORT || 8080;
    const apiPort = args.apiPort || dockerConfig.API_PORT || 8080;
    const host = args.host || dockerConfig.HOST || '0.0.0.0';
    const maxResponseSize = args.maxResponseSize || dockerConfig.MAX_RESPONSE_SIZE || 104857600;
    const dbCacheSize = args.dbCacheSize || dockerConfig.DB_CACHE_SIZE || 1000000;
    const dbRecoveryLog = args.dbRecoveryLog ?? dockerConfig.DB_RECOVERY_LOG ?? false;
    const timeoutMins = args.timeoutMins || dockerConfig.TIMEOUT_MINS || 1;
    const network = args.network || dockerConfig.NETWORK;

    let javaOptions: string;
    if (useToml && config.JAVA_OPTIONS?.flags) {
      javaOptions = config.JAVA_OPTIONS.flags.join(' ');
    } else {
      javaOptions = args.javaOptions || DEFAULT_JAVA_OPTIONS.join(' ');
    }

    let configFlags: string[] = [];
    if (useToml && config.CONFIG?.flags) {
      configFlags = config.CONFIG.flags;
    } else {
      configFlags = [
        `api.key=${apiKey}`,
        'api.addrs.addr.name=.*',
        'api.addrs.addr.regex=true',
        `database.response.bodysize=${maxResponseSize}`,
        `database.cache.size=${dbCacheSize}`,
        `database.recoverylog=${dbRecoveryLog ? 'true' : 'false'}`,
      ];
    }

    log.info(`Starting ZAP daemon: ${containerName}`);
    log.info(`Image: ${zapImage}`);
    log.info(`Port: ${port}`);
    log.info(`API Key: ${apiKey}`);
    if (useToml) {
      log.info(`Config: TOML (${args.toml})`);
    }

    try {
      const existing = await docker.listContainers({ all: true });
      const existingContainer = existing.find(c => c.Names.includes(`/${containerName}`));
      
      if (existingContainer) {
        if (existingContainer.State === 'running') {
          log.warn(`Container ${containerName} is already running`);
          return;
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

      const zapCmd = [
        'zap.sh', '-daemon',
        '-host', host,
        '-port', `${apiPort}`,
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

      log.info(`Creating container ${containerName}...`);
      const container = await docker.createContainer(createOptions);
      await container.start();

      log.info('Waiting for ZAP API to respond...');
      const maxAttempts = timeoutMins * 20;
      const isReady = await waitForZapReady(port, apiKey, maxAttempts);

      if (!isReady) {
        const logs = await container.logs({ stdout: true, stderr: true });
        log.error('ZAP failed to start within timeout');
        log.error(`Container logs:\n${logs}`);
        
        await container.stop({ t: 0 });
        await container.remove({ force: true });
        process.exit(1);
      }

      log.success('✅ ZAP Daemon is UP and Running!');
      log.info(`Container ID: ${container.id}`);
      log.info(`Proxy/API URL: http://${host}:${port}/zap`);
      log.info(`API Key: ${apiKey}`);
      
      setDevOpsVariables([
        { name: 'ZAP_API_KEY', value: apiKey },
        { name: 'ZAP_PROXY_URL', value: `http://${host}:${port}/zap` },
        { name: 'ZAP_IMAGE_NAME', value: zapImage },
        { name: 'ZAP_CONTAINER_ID', value: container.id },
        { name: 'ZAP_DAEMON_PORT', value: String(port) },
        { name: 'ZAP_DAEMON_HOST', value: host },
      ]);

      log.info('VARIABLES: \n'+JSON.stringify([
        { name: 'ZAP_API_KEY', value: apiKey },
        { name: 'ZAP_PROXY_URL', value: `http://${host}:${port}/zap` },
        { name: 'ZAP_IMAGE_NAME', value: zapImage },
        { name: 'ZAP_CONTAINER_ID', value: container.id },
        { name: 'ZAP_DAEMON_PORT', value: String(port) },
        { name: 'ZAP_DAEMON_HOST', value: host },
      ],null,2))
      
      log.info(`\nTo stop the daemon, run:`);
      log.info(`  zapr docker stop-daemon ${args.name ? `-N ${args.name}` : ''}`);
      
      log.info(`\nTo use in subsequent commands:`);
      log.info(`  zapr -H localhost -P ${port} -k ${apiKey} ...`);
    } catch (error: any) {
      log.error(`Failed to start ZAP daemon: ${error.message}`);
      process.exit(1);
    }
  },
};

export const stopDaemonCommand: yargs.CommandModule = {
  command: 'stop-daemon',
  describe: 'Stop the ZAP daemon running in Docker',
  builder: (yargs) => {
    return yargs
      .option('name', {
        alias: 'N',
        type: 'string',
        default: 'zap-daemon',
        description: 'Container name to stop',
      })
      .option('force', {
        alias: 'f',
        type: 'boolean',
        default: false,
        description: 'Force stop the container',
      });
  },
  handler: async (argv) => {
    const containerName = (argv.name as string) || 'zap-daemon';
    const force = argv.force as boolean;

    log.info(`Stopping ZAP daemon: ${containerName}`);

    try {
      const containers = await docker.listContainers({ all: true });
      const containerInfo = containers.find(c => c.Names.includes(`/${containerName}`));
      
      if (!containerInfo) {
        log.error(`Container ${containerName} not found`);
        process.exit(1);
      }

      const container = docker.getContainer(containerInfo.Id);
      
      if (containerInfo.State === 'running') {
        await container.stop({ t: force ? 0 : 10 });
        log.success(`Container ${containerName} stopped`);
      } else {
        log.info(`Container ${containerName} is not running (state: ${containerInfo.State})`);
      }

      await container.remove({ force: true });
      log.success(`Container ${containerName} removed`);
    } catch (error: any) {
      log.error(`Failed to stop ZAP daemon: ${error.message}`);
      process.exit(1);
    }
  },
};