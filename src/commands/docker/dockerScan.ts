import yargs from 'yargs';
import Docker from 'dockerode';
import * as path from 'path';
import * as fs from 'fs';
import { initLoggerWithWorkspace, getWorkspacePath } from '../../utils/workspace';
import { log } from '../../utils/logger';

const docker = new Docker();

interface DockerScanOptions {
  target: string;
  configFile?: string;
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
}

export async function runZapDockerScan(
  scriptName: string,
  args: string[],
  options: DockerScanOptions
): Promise<number> {
  const zapImage = options.image || 'ghcr.io/zaproxy/zaproxy:stable';
  
  log.info(`Pulling ZAP Docker image: ${zapImage}`);
  try {
    await docker.pull(zapImage);
    log.success('Image pulled successfully');
  } catch (err: any) {
    log.warn(`Could not pull image: ${err.message}, trying to use local image`);
  }

  const workspace = options.workspace || process.env.ZAPSTER_WORKSPACE || '.';
  const hostWorkspace = path.isAbsolute(workspace) 
    ? workspace 
    : path.resolve(process.cwd(), workspace);

  if (!fs.existsSync(hostWorkspace)) {
    fs.mkdirSync(hostWorkspace, { recursive: true });
  }

  const binds: string[] = [];
  const volumes: Record<string, string> = {};

  const configFile = options.configFile;
  const genFile = options.genFile;
  const reportHtml = options.reportHtml;
  const reportMd = options.reportMd;
  const reportXml = options.reportXml;
  const reportJson = options.reportJson;
  const contextFile = options.contextFile;
  const progressFile = options.progressFile;

  if (configFile || genFile || reportHtml || reportMd || reportXml || reportJson || contextFile || progressFile) {
    const wrkDir = '/zap/wrk';
    binds.push(`${hostWorkspace}:${wrkDir}:rw`);
    volumes[wrkDir] = hostWorkspace;
  }

  log.info(`Starting ZAP ${scriptName}...`);
  log.info(`Target: ${options.target}`);

  const cmdArgs: string[] = ['python', '/docker/scripts/' + scriptName + '.py', ...args];

  return new Promise<number>((resolve) => {
    docker.run(
      zapImage,
      cmdArgs,
      process.stdout,
      {
        HostConfig: {
          Binds: binds,
          PortBindings: options.port ? {
            '8080/tcp': [{ HostPort: String(options.port) }]
          } : undefined,
          AutoRemove: true,
          NetworkMode: options.network || 'host',
        },
        Env: options.debug ? ['DEBUG=true'] : [],
      },
      (err: Error | null, data: any) => {
        if (err) {
          log.error(`Docker run error: ${err.message}`);
          resolve(1);
        } else {
          resolve(data?.StatusCode ?? 0);
        }
      }
    );
  });
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
  if (options.port) args.push('-P', String(options.port));
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
  if (options.port) args.push('-P', String(options.port));
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

  if (options.configFile) args.push('-c', options.configFile);
  if (options.configUrl) args.push('-u', options.configUrl);
  if (options.genFile) args.push('-g', options.genFile);
  if (options.reportHtml) args.push('-r', options.reportHtml);
  if (options.reportMd) args.push('-w', options.reportMd);
  if (options.reportXml) args.push('-x', options.reportXml);
  if (options.reportJson) args.push('-J', options.reportJson);
  if (options.includeAlpha) args.push('-a');
  if (options.debug) args.push('-d');
  if (options.port) args.push('-P', String(options.port));
  if (options.delaySecs) args.push('-D', String(options.delaySecs));
  if (options.defaultRulesInfo) args.push('-i');
  if (options.ignoreWarning) args.push('-I');
  if (options.minLevel) args.push('-l', options.minLevel);
  if (options.contextFile) args.push('-n', options.contextFile);
  if (options.progressFile) args.push('-p', options.progressFile);
  if (options.shortOutput) args.push('-s');
  if (options.timeoutMins) args.push('-T', String(options.timeoutMins));
  if (options.user) args.push('-U', options.user);
  if (options.zapOptions) args.push('-z', options.zapOptions);
  if (options.hook) args.push('--hook', options.hook);
  if ((options as any).schema) args.push('--schema', (options as any).schema);

  return args;
}

export { docker };