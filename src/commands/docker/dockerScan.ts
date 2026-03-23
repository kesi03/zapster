import { spawnSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { log } from '../../utils/logger';

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
}

export async function runZapDockerScan(
  scriptName: string,
  zapArgs: string[],
  options: DockerScanOptions
): Promise<number> {
  const zapImage = options.image || 'ghcr.io/zaproxy/zaproxy:stable';

  log.info(`Pulling ZAP Docker image: ${zapImage}`);
  await new Promise<void>((resolve) => {
    const pull = spawnSync('docker', ['pull', zapImage], { stdio: 'inherit' });
    if (pull.status === 0) {
      resolve();
    } else {
      log.warn('Could not pull image, trying to use local image');
      resolve();
    }
  });

  const workspace = options.workspace || process.env.ZAPSTER_WORKSPACE || '.';
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

  const dockerFlags: string[] = ['run', '--rm'];

  if (options.network && options.network !== 'host') {
    dockerFlags.push('--network', options.network);
  } else {
    dockerFlags.push('--network', 'host');
  }

  dockerFlags.push(
    '-v', `${hostWorkspace}:/zap/wrk/:rw`,
    '-v', `${configPath || hostWorkspace}:/zap/cfg/:rw`,
    '-v', `${apiFolder || hostWorkspace}:/zap/specs/:ro`
  );

  if (options.debug) {
    dockerFlags.push('-e', 'DEBUG=true');
  }

  if (options.port) {
    dockerFlags.push('-p', `${options.port}:8080`);
  }

  dockerFlags.push(zapImage);

  const finalArgs = [...dockerFlags, ...zapArgs];

  log.info(`Starting ZAP ${scriptName}...`);
  log.info(`Target: ${options.target}`);
  log.info(`Command: docker ${finalArgs.join(' ')}`);

  const result = spawnSync('docker', finalArgs, {
    stdio: 'inherit',
    shell: true
  });

  return result.status ?? 0;
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
