import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { log } from '../../utils/logger';

interface DockerScanOptions {
  target: string;
  format?: string;
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
  await new Promise<void>((resolve) => {
    const pull = spawn('docker', ['pull', zapImage]);
    pull.on('close', () => resolve());
  });

  const workspace = options.workspace || process.env.ZAPSTER_WORKSPACE || '.';
  const hostWorkspace = path.isAbsolute(workspace)
    ? workspace
    : path.resolve(process.cwd(), workspace);

  if (!fs.existsSync(hostWorkspace)) {
    fs.mkdirSync(hostWorkspace, { recursive: true });
  }

  const dockerArgs: string[] = ['run', '--rm'];

  if (options.network && options.network !== 'host') {
    dockerArgs.push('--network', options.network);
  }

  if (options.port) {
    dockerArgs.push('-p', `${options.port}:8080`);
  }

  if (options.debug) {
    dockerArgs.push('-e', 'DEBUG=true');
  }

  dockerArgs.push('-v', `${hostWorkspace}:/zap/wrk:rw`);

  dockerArgs.push('-w', '/zap/wrk');

  dockerArgs.push(zapImage, 'python', `/docker/scripts/${scriptName}.py`, ...args);

  log.info(`Starting ZAP ${scriptName}...`);
  log.info(`Target: ${options.target}`);
  log.info(`Command: docker ${dockerArgs.join(' ')}`);

  return new Promise<number>((resolve) => {
    const proc = spawn('docker', dockerArgs, { stdio: 'inherit' });

    const timeoutMs = (options.timeoutMins || 60) * 60 * 1000;
    const timeout = setTimeout(() => {
      log.warn('Timeout reached, stopping container...');
      spawn('docker', ['stop', '-t', '5', '-s', 'SIGINT', $(proc.pid)]);
    }, timeoutMs);

    proc.on('close', (code) => {
      clearTimeout(timeout);
      resolve(code ?? 0);
    });

    proc.on('error', (err) => {
      log.error(`Docker error: ${err.message}`);
      resolve(1);
    });
  });
}

function $(pid: number | undefined): string {
  return pid?.toString() ?? '';
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
  if ((options as any).hostOverride) args.push('-O', (options as any).hostOverride);

  return args;
}
