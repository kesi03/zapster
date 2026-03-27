import Docker from 'dockerode';
import * as path from 'path';
import * as fs from 'fs';
import { log } from '../../utils/logger';

const docker = new Docker();

interface DockerScanOptions {
  target: string;
  format?: string;
  configFile?: string;
  configPath?: string;
  apiFolder?: string;
  configUrl?: string;
  genFile?: string;
  spiderMins?: number;
  reportHtml?: string;
  reportMd?: string;
  reportXml?: string;
  reportJson?: string;
  includeAlpha?: boolean;
  debug?: boolean;
  port?: number;
  delaySecs?: number;
  defaultRulesInfo?: boolean;
  ignoreWarning?: boolean;
  ajaxSpider?: boolean;
  minLevel?: string;
  contextFile?: string;
  progressFile?: string;
  shortOutput?: boolean;
  timeoutMins?: number;
  user?: string;
  zapOptions?: string;
  hook?: string;
  auto?: boolean;
  autoOff?: boolean;
  planOnly?: boolean;
  workspace?: string;
  image?: string;
  network?: string;
  name?: string;
  maxResponseSize?: number;
  dbCacheSize?: number;
  dbRecoveryLog?: boolean;
  javaOptions?: string;
  apiKey?: string;
}

export async function runZapDockerScan(
  scriptName: string,
  zapArgs: string[],
  options: DockerScanOptions
): Promise<number> {
  const zapImage = options.image || 'ghcr.io/zaproxy/zaproxy:stable';
  const containerName = options.name || `zap-${scriptName.replace(/[^a-z0-9-]/g, '-')}`;

  log.info(`Starting ZAP ${scriptName}: ${containerName}`);
  log.info(`Image: ${zapImage}`);

  try {
    const existing = await docker.listContainers({ all: true });
    const existingContainer = existing.find(c => c.Names.includes(`/${containerName}`));
    
    if (existingContainer) {
      if (existingContainer.State === 'running') {
        log.info(`Stopping existing running container ${containerName}`);
        const container = docker.getContainer(existingContainer.Id);
        await container.stop({ t: 0 });
      }
      log.info(`Removing existing container ${containerName}`);
      const container = docker.getContainer(existingContainer.Id);
      await container.remove({ force: true });
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

    const workspace = options.workspace || process.env.ZAPR_WORKSPACE || '.';
    const hostWorkspace = path.isAbsolute(workspace)
      ? workspace
      : path.resolve(process.cwd(), workspace);

    if (!fs.existsSync(hostWorkspace)) {
      fs.mkdirSync(hostWorkspace, { recursive: true });
    }

    const configPath = options.configPath
      ? (path.isAbsolute(options.configPath) ? options.configPath : path.resolve(process.cwd(), options.configPath))
      : null;

    const apiFolder = options.apiFolder
      ? (path.isAbsolute(options.apiFolder) ? options.apiFolder : path.resolve(process.cwd(), options.apiFolder))
      : null;

    const binds: string[] = [`${hostWorkspace}:/zap/wrk/:rw`];
    if (configPath) {
      binds.push(`${configPath}:/zap/cfg/:rw`);
    }
    if (apiFolder) {
      binds.push(`${apiFolder}:/zap/specs/:ro`);
    }

    const env: string[] = [];
    if (options.debug) {
      env.push('DEBUG=true');
    }

    if (options.javaOptions) {
      env.push(`_JAVA_OPTIONS=${options.javaOptions}`);
    }

    if (options.apiKey) {
      env.push(`ZAP_API_KEY=${options.apiKey}`);
    }

    if (options.maxResponseSize || options.dbCacheSize || options.dbRecoveryLog !== undefined) {
      zapArgs.push(
        '-config', `database.response.bodysize=${options.maxResponseSize || 104857600}`,
        '-config', `database.cache.size=${options.dbCacheSize || 1000000}`,
        '-config', `database.recoverylog=${options.dbRecoveryLog ? 'true' : 'false'}`
      );
    }

    const createOptions: Docker.ContainerCreateOptions = {
      name: containerName,
      Image: zapImage,
      Env: env,
      Cmd: zapArgs,
      HostConfig: {
        AutoRemove: true,
        Binds: binds,
        ExtraHosts: ['host.docker.internal:host-gateway'],
        PortBindings: {},
      },
    };

    if (options.network && options.network !== 'host') {
      createOptions.HostConfig!.NetworkMode = options.network;
    }

    if (options.port) {
      createOptions.ExposedPorts = {
        [`${options.port}/tcp`]: {},
      };
      createOptions.HostConfig!.PortBindings = {
        [`${options.port}/tcp`]: [{ HostPort: String(options.port) }],
      };
    }

    log.info(`Creating container ${containerName}...`);
    const container = await docker.createContainer(createOptions);
    await container.start();

    const maxAttempts = (options.timeoutMins || 30) * 20;
    let lastStatus = '';
    let attempt = 0;

    while (attempt < maxAttempts) {
      const info = await container.inspect();
      
      if (!info.State.Running) {
        const exitCode = info.State.ExitCode ?? 0;
        
        if (exitCode === 0 || exitCode === 1 || exitCode === 2) {
          return exitCode;
        }
        
        const logs = await container.logs({ stdout: true, stderr: true });
        log.error(`Container exited with code: ${exitCode}`);
        log.error(`Container logs:\n${logs}`);
        return exitCode;
      }

      if (info.State.Status !== lastStatus) {
        lastStatus = info.State.Status;
        log.info(`Container status: ${lastStatus}`);
      }

      await new Promise(resolve => setTimeout(resolve, 3000));
      attempt++;
    }

    log.warn('Timeout reached, attempting to stop container');
    await container.stop({ t: 0 });
    return 1;
  } catch (error: any) {
    log.error(`Failed to run ZAP ${scriptName}: ${error.message}`);
    return 1;
  }
}

export function buildZapBaselineArgs(options: DockerScanOptions): string[] {
  const args: string[] = ['zap-baseline.py', '-t', options.target];

  if (options.configFile) args.push('-c', options.configFile);
  if (options.configUrl) args.push('-u', options.configUrl);
  if (options.genFile) args.push('-g', options.genFile);
  if (options.spiderMins) args.push('-m', String(options.spiderMins));
  if (options.reportHtml) args.push('-r', options.reportHtml);
  if (options.reportMd) args.push('-w', options.reportMd);
  if (options.reportXml) args.push('-x', options.reportXml);
  if (options.reportJson) args.push('-J', options.reportJson);
  if (options.includeAlpha) args.push('-a');
  if (options.debug) args.push('-d');
  if (options.delaySecs) args.push('-D', String(options.delaySecs));
  if (options.defaultRulesInfo) args.push('-i');
  if (options.ignoreWarning) args.push('-I');
  if (options.ajaxSpider) args.push('-j');
  if (options.minLevel) args.push('-l', options.minLevel);
  if (options.contextFile) args.push('-n', options.contextFile);
  if (options.progressFile) args.push('-p', options.progressFile);
  if (options.shortOutput) args.push('-s');
  if (options.timeoutMins) args.push('-T', String(options.timeoutMins));
  if (options.user) args.push('-U', options.user);
  if (options.zapOptions) args.push('-z', options.zapOptions);
  if (options.hook) args.push('--hook', options.hook);
  if (options.auto) args.push('--auto');
  if (options.autoOff) args.push('--autooff');
  if (options.planOnly) args.push('--plan-only');

  return args;
}

export function buildZapFullScanArgs(options: DockerScanOptions): string[] {
  const args: string[] = ['zap-full-scan.py', '-t', options.target];

  if (options.configFile) args.push('-c', options.configFile);
  if (options.configUrl) args.push('-u', options.configUrl);
  if (options.genFile) args.push('-g', options.genFile);
  if (options.spiderMins) args.push('-m', String(options.spiderMins));
  if (options.reportHtml) args.push('-r', options.reportHtml);
  if (options.reportMd) args.push('-w', options.reportMd);
  if (options.reportXml) args.push('-x', options.reportXml);
  if (options.reportJson) args.push('-J', options.reportJson);
  if (options.includeAlpha) args.push('-a');
  if (options.debug) args.push('-d');
  if (options.delaySecs) args.push('-D', String(options.delaySecs));
  if (options.defaultRulesInfo) args.push('-i');
  if (options.ignoreWarning) args.push('-I');
  if (options.ajaxSpider) args.push('-j');
  if (options.minLevel) args.push('-l', options.minLevel);
  if (options.contextFile) args.push('-n', options.contextFile);
  if (options.progressFile) args.push('-p', options.progressFile);
  if (options.shortOutput) args.push('-s');
  if (options.timeoutMins) args.push('-T', String(options.timeoutMins));
  if (options.user) args.push('-U', options.user);
  if (options.zapOptions) args.push('-z', options.zapOptions);
  if (options.hook) args.push('--hook', options.hook);

  return args;
}

export function buildZapApiScanArgs(options: DockerScanOptions): string[] {
  const args: string[] = ['zap-api-scan.py', '-t', options.target];

  if (options.format) args.push('-f', options.format);
  if (options.configFile) args.push('-c', options.configFile);
  if (options.configUrl) args.push('-u', options.configUrl);
  if (options.genFile) args.push('-g', options.genFile);
  if (options.reportHtml) args.push('-r', options.reportHtml);
  if (options.reportMd) args.push('-w', options.reportMd);
  if (options.reportXml) args.push('-x', options.reportXml);
  if (options.reportJson) args.push('-J', options.reportJson);
  if (options.includeAlpha) args.push('-a');
  if (options.debug) args.push('-d');
  if (options.delaySecs) args.push('-D', String(options.delaySecs));
  if (options.defaultRulesInfo) args.push('-i');
  if (options.ignoreWarning) args.push('-I');
  if (options.minLevel) args.push('-l', options.minLevel);
  if (options.contextFile) args.push('-n', options.contextFile);
  if (options.progressFile) args.push('--progress-file', options.progressFile);
  if (options.shortOutput) args.push('-s');
  if (options.timeoutMins) args.push('-T', String(options.timeoutMins));
  if (options.user) args.push('-U', options.user);
  if (options.zapOptions) args.push('-z', options.zapOptions);
  if (options.hook) args.push('--hook', options.hook);
  if ((options as any).schema) args.push('--schema', (options as any).schema);
  if ((options as any).hostOverride) args.push('-O', (options as any).hostOverride);

  return args;
}