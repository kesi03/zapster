import yargs from 'yargs';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { log } from '../../utils/logger';
import { DEFAULT_JAVA_OPTIONS } from '../../utils/constants';

interface JavaAutomateArgs {
  jarPath: string;
  jvmOpts?: string;
  dir?: string;
  host?: string;
  port?: number;
  apiKey?: string;
  session?: string;
  extraConfig?: string;
  name?: string;
}

export const javaCommand: yargs.CommandModule = {
  command: 'java',
  describe: 'Java-based ZAP commands (using pm2)',
  builder: (yargs) => {
    return yargs
      .command(automateCommand)
      .command(stopAutomateCommand)
      .demandCommand(1, 'Specify a java subcommand: automate, stop');
  },
  handler: () => {
    yargs.showHelp();
  },
};

export const automateCommand: yargs.CommandModule = {
  command: 'automate',
  describe: 'Start ZAP as a daemon using Java and pm2',
  builder: (yargs) => {
    return yargs
      .option('jar-path', {
        alias: 'j',
        type: 'string',
        description: 'Path to zap.jar',
        demandOption: true,
      })
      .option('jvm-opts', {
        type: 'string',
        default: DEFAULT_JAVA_OPTIONS.join(' '),
        description: 'JVM options (e.g. -Xmx4g)',
      })
      .option('dir', {
        type: 'string',
        description: 'ZAP working directory',
        default: process.cwd(),
      })
      .option('host', {
        type: 'string',
        default: '0.0.0.0',
        description: 'ZAP host to bind to',
      })
      .option('port', {
        alias: 'P',
        type: 'number',
        default: 8080,
        description: 'ZAP proxy port',
      })
      .option('api-key', {
        type: 'string',
        description: 'ZAP API key',
      })
      .option('session', {
        type: 'string',
        description: 'Session name for new session',
      })
      .option('extra-config', {
        type: 'string',
        description: 'Additional ZAP configuration options',
      })
      .option('name', {
        alias: 'N',
        type: 'string',
        description: 'PM2 process name',
        default: 'zap-daemon',
      });
  },
  handler: async (argv) => {
    const args = argv as unknown as JavaAutomateArgs;

    const jarPath = args.jarPath;
    if (!jarPath) {
      log.error('jar-path is required');
      process.exit(1);
    }

    const absoluteJarPath = path.isAbsolute(jarPath) ? jarPath : path.resolve(process.cwd(), jarPath);
    if (!fs.existsSync(absoluteJarPath)) {
      log.error(`JAR file not found: ${absoluteJarPath}`);
      process.exit(1);
    }

    const dir = args.dir || process.cwd();
    const absoluteDir = path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir);
    if (!fs.existsSync(absoluteDir)) {
      fs.mkdirSync(absoluteDir, { recursive: true });
    }

    const tmpDir = path.join(absoluteDir, 'tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const port = args.port || 8080;
    const host = args.host || '0.0.0.0';
    const apiKey = args.apiKey || '';
    const session = args.session || '';
    const extraConfig = args.extraConfig || '';
    const processName = args.name || 'zap-daemon';
    const jvmOpts = args.jvmOpts || DEFAULT_JAVA_OPTIONS.join(' ');

    const cmd = [
      'nohup java',
      jvmOpts,
      `-Djava.io.tmpdir=${tmpDir}`,
      `-jar ${absoluteJarPath}`,
      '-daemon',
      `-host ${host}`,
      `-port ${port}`,
      `-dir ${absoluteDir}`,
      `-config api.key=${apiKey}`,
      session ? `-newsession ${session}` : '',
      extraConfig,
      '> zap.log 2>&1 &',
    ].filter(Boolean).join(' \\\n  ');

    log.info(`Starting ZAP daemon with pm2...`);
    log.info(`Command:\n${cmd}`);

    try {
      const pm2List = execSync('pm2 list', { encoding: 'utf-8' });
      if (pm2List.includes(processName)) {
        log.info(`Stopping existing pm2 process: ${processName}`);
        execSync(`pm2 stop ${processName}`, { encoding: 'utf-8' });
        execSync(`pm2 delete ${processName}`, { encoding: 'utf-8' });
      }

      const scriptPath = path.join(absoluteDir, 'start-zap.sh');
      const scriptContent = `#!/bin/bash
${cmd}
`;
      fs.writeFileSync(scriptPath, scriptContent);
      fs.chmodSync(scriptPath, '755');

      execSync(`pm2 start ${scriptPath} --name ${processName}`, { encoding: 'utf-8' });

      log.success(`ZAP daemon started with pm2 as "${processName}"`);
      log.info(`ZAP is starting up on ${host}:${port}`);
      log.info(`Logs: ${path.join(absoluteDir, 'zap.log')}`);
    } catch (error: any) {
      log.error(`Failed to start ZAP daemon: ${error.message}`);
      process.exit(1);
    }
  },
};

export const stopAutomateCommand: yargs.CommandModule = {
  command: 'stop',
  describe: 'Stop ZAP daemon managed by pm2',
  builder: (yargs) => {
    return yargs
      .option('name', {
        alias: 'N',
        type: 'string',
        description: 'PM2 process name',
        default: 'zap-daemon',
      });
  },
  handler: async (argv) => {
    const args = argv as { name?: string };
    const processName = args.name || 'zap-daemon';

    try {
      const pm2List = execSync('pm2 list', { encoding: 'utf-8' });
      if (!pm2List.includes(processName)) {
        log.warn(`No pm2 process found: ${processName}`);
        return;
      }

      execSync(`pm2 stop ${processName}`, { encoding: 'utf-8' });
      execSync(`pm2 delete ${processName}`, { encoding: 'utf-8' });
      log.success(`ZAP daemon stopped and removed from pm2`);
    } catch (error: any) {
      log.error(`Failed to stop ZAP daemon: ${error.message}`);
      process.exit(1);
    }
  },
};
