import chalk from "chalk";
import * as path from 'node:path';
import * as fs from 'node:fs';
import { Arguments } from "yargs";
import { getWorkspace } from "../../utils/workspace";
import pm2 from 'pm2';
import * as toml from '@iarna/toml';
import { PM2ProcessInfo, TomlConfig } from "./types";

function parseTomlConfig(tomlPath: string): TomlConfig {
  const content = fs.readFileSync(tomlPath, 'utf-8');
  return toml.parse(content) as TomlConfig;
}

function resolveTomlPaths(config: TomlConfig, workspace: string): TomlConfig {
  return {
    ...config,
    ENV: {
      ...config.ENV,
      ZAP_DOWNLOADER_WORKSPACE:
        config.ENV?.ZAP_DOWNLOADER_WORKSPACE || workspace,
    },
    PATHS: {
      ...config.PATHS,
      JAR_PATH: config.PATHS?.JAR_PATH || '',
      DIR: config.PATHS?.DIR || '.zap',
      INSTALL_DIR:
        config.PATHS?.INSTALL_DIR ||
        path.join(workspace, 'install').replace(/\\/g, '/'),
    },
  };
}

export interface StartDaemonOptions {
  toml?: string;
  dir?: string;
  workspace?: string;
  host?: string;
  port?: number;
  apiKey?: string;
  name?: string;
}

export interface StartDaemonResult {
  host: string;
  port: number;
  apiKey: string;
  processName: string;
  workspace: string;
  config?: TomlConfig;
  tomlPath?: string;
}

export async function startDaemon(options: StartDaemonOptions): Promise<StartDaemonResult> {
  let config: TomlConfig = {};
  let useToml = false;
  let tomlPath: string | undefined;

  let workspace = options.workspace || getWorkspace();

  if (options.toml) {
    if (!fs.existsSync(options.toml)) {
      throw new Error(`TOML file not found: ${options.toml}`);
    }

    console.log(chalk.blue(`Using TOML config: ${options.toml}`));

    const tomlDir = path.dirname(path.resolve(options.toml));
    workspace = tomlDir;

    config = parseTomlConfig(options.toml);
    config = resolveTomlPaths(config, workspace);
    useToml = true;
    tomlPath = options.toml;

    console.log(chalk.yellow("\n=== DEBUG PATHS ==="));
    console.log("options.toml:", path.resolve(options.toml));
    console.log("workspace:", workspace);
    console.log("ENV.ZAP_DOWNLOADER_WORKSPACE:", config.ENV?.ZAP_DOWNLOADER_WORKSPACE);
    console.log("ENV.ZAP_DOWNLOADER_ZAP_HOME:", config.ENV?.ZAP_DOWNLOADER_ZAP_HOME);
    console.log("PATHS.INSTALL_DIR:", config.PATHS?.INSTALL_DIR);
    console.log("PATHS.JAR_PATH:", config.PATHS?.JAR_PATH);
    console.log("PATHS.DIR:", config.PATHS?.DIR);
    console.log("====================\n");
  }

  const host = useToml ? (config.SERVER?.HOST || '0.0.0.0') : (options.host || '0.0.0.0');
  const port = useToml ? (config.SERVER?.PORT || 8080) : (options.port || 8080);
  const apiKey = useToml ? '' : (options.apiKey || '');
  const processName = options.name || 'zap-daemon';

  const zapHomeDir = useToml
    ? (config.ENV?.ZAP_DOWNLOADER_ZAP_HOME || '.zap')
    : '.zap';

  const zapInstallDir = useToml
    ? (
        path.isAbsolute(config.PATHS?.INSTALL_DIR || "")
          ? config.PATHS!.INSTALL_DIR!
          : path.join(workspace, config.PATHS?.INSTALL_DIR || "install")
      )
    : (options.dir || path.join(options.workspace || getWorkspace(), 'zap'));

  const workingDir = useToml
    ? (config.ENV?.ZAP_DOWNLOADER_WORKSPACE || workspace)
    : (options.workspace || getWorkspace());

  console.log(chalk.yellow("\n=== DEBUG RESOLVED DIRECTORIES ==="));
  console.log("workingDir:", workingDir);
  console.log("zapInstallDir:", zapInstallDir);
  console.log("zapHomeDir:", zapHomeDir);
  console.log("tmpDir:", path.join(workingDir, "tmp"));
  console.log("zapDir:", path.join(workingDir, zapHomeDir));
  console.log("====================\n");

  let jarPath: string | null = null;

  if (useToml && config.PATHS?.JAR_PATH) {
    const candidate = path.isAbsolute(config.PATHS.JAR_PATH)
      ? config.PATHS.JAR_PATH
      : path.join(zapInstallDir, config.PATHS.JAR_PATH);

    console.log(chalk.yellow("Checking JAR candidate:"), candidate);
    console.log("Exists?", fs.existsSync(candidate));

    if (fs.existsSync(candidate)) {
      jarPath = candidate;
    }
  }

  if (!jarPath && fs.existsSync(zapInstallDir)) {
    console.log(chalk.yellow("Running fallback recursive search in:"), zapInstallDir);

    const walk = (dir: string): string | null => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const found = walk(full);
          if (found) return found;
        } else if (entry.isFile() && entry.name.endsWith('.jar') && entry.name.startsWith('zap')) {
          console.log(chalk.green("Found fallback JAR:"), full);
          return full;
        }
      }
      return null;
    };

    jarPath = walk(zapInstallDir);
  }

  console.log(chalk.yellow("Final resolved JAR path:"), jarPath);

  if (!jarPath) {
    throw new Error(`JAR file not found in: ${zapInstallDir}`);
  }

  if (!fs.existsSync(workingDir)) fs.mkdirSync(workingDir, { recursive: true });

  const tmpDir = path.join(workingDir, 'tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const zapDir = path.join(workingDir, zapHomeDir);
  if (!fs.existsSync(zapDir)) fs.mkdirSync(zapDir, { recursive: true });

  const pluginDir = path.join(zapDir, 'plugin');
  const installPluginDir = path.join(zapInstallDir, 'plugin');

  if (!fs.existsSync(pluginDir) && fs.existsSync(installPluginDir)) {
    fs.mkdirSync(pluginDir, { recursive: true });
    const pluginFiles = fs.readdirSync(installPluginDir);
    for (const f of pluginFiles) {
      const src = path.join(installPluginDir, f);
      const dest = path.join(pluginDir, f);
      if (!fs.existsSync(dest)) fs.copyFileSync(src, dest);
    }
  }

  const absJarPath = path.resolve(jarPath);
  const absInstallDir = path.dirname(absJarPath);
  const absWorkingDir = path.resolve(workingDir);
  const absTmpDir = path.resolve(tmpDir);
  const absZapDir = path.resolve(zapDir);

  const javaOptions: string[] = [];

  if (useToml && config.JAVA_OPTIONS?.flags) {
    javaOptions.push(...config.JAVA_OPTIONS.flags);
  } else {
    javaOptions.push('-Xmx2g');
  }

  javaOptions.push(`-Djava.io.tmpdir="${absTmpDir}"`);

  const configFlags: string[] = [];

  if (useToml && config.CONFIG?.flags) {
    configFlags.push(...config.CONFIG.flags);
  } else {
    configFlags.push(
      apiKey ? `api.key=${apiKey}` : 'api.disablekey=true',
      'api.addrs.addr.name=.*',
      'api.addrs.addr.regex=true'
    );
  }

  const javaArgs = [
    ...javaOptions,
    `-Djava.io.tmpdir="${absTmpDir}"`,
    '-jar', absJarPath,
    '-daemon',
    '-dir', absZapDir,
    '-installdir', absInstallDir,
    '-host', host,
    '-port', String(port),
    ...configFlags.flatMap(f => ['-config', f]),
  ];

  console.log(chalk.blue(`Starting ZAP daemon with pm2...`));
  console.log(chalk.gray(`JAR: ${jarPath}`));
  console.log(chalk.gray(`Port: ${port}`));
  console.log(chalk.gray(`Working dir: ${workingDir}`));
  if (useToml) {
    console.log(chalk.gray(`Config: TOML (${options.toml})`));
  }

  try {
    await new Promise<void>((resolve, reject) => {
      pm2.connect(err => err ? reject(err) : resolve());
    });

    const processes = await new Promise<PM2ProcessInfo[]>((resolve, reject) => {
      pm2.list((err, list) => err ? reject(err) : resolve(list));
    });

    const existing = processes.find(p => p.name === processName);
    if (existing) {
      console.log(chalk.yellow(`Stopping existing pm2 process: ${processName}`));
      await new Promise<void>((resolve, reject) => {
        pm2.stop(processName, err => err ? reject(err) : resolve());
      });
      await new Promise<void>((resolve, reject) => {
        pm2.delete(processName, err => err ? reject(err) : resolve());
      });
    }

    await new Promise<void>((resolve, reject) => {
      pm2.start({
        name: processName,
        script: 'java',
        args: javaArgs,
        cwd: workingDir,
      }, err => err ? reject(err) : resolve());
    });

    console.log(chalk.green(`ZAP daemon started as "${processName}"`));
    console.log(chalk.blue(`ZAP is starting up on ${host}:${port}`));

  } catch (err: any) {
    throw new Error(`Failed to start ZAP daemon: ${err.message}`);
  } finally {
    pm2.disconnect();
  }

  return {
    host,
    port,
    apiKey: apiKey || '',
    processName,
    workspace: workingDir,
    config: useToml ? config : undefined,
    tomlPath,
  };
}

export const startDaemonCommand = {
  command: 'start',
  describe: 'Start ZAP as a daemon using pm2',
  builder: (yargs: any) => {
    return yargs
      .option('toml', {
        alias: 't',
        description: 'Path to zap.toml configuration file',
        type: 'string',
      })
      .option('dir', {
        alias: 'd',
        description: 'ZAP installation directory (where zap.jar is)',
        type: 'string',
      })
      .option('workspace', {
        alias: 'w',
        description: 'ZAP working directory',
        type: 'string',
      })
      .option('host', {
        description: 'ZAP host to bind to',
        type: 'string',
        default: '0.0.0.0',
      })
      .option('port', {
        alias: 'P',
        description: 'ZAP proxy port',
        type: 'number',
        default: 8080,
      })
      .option('api-key', {
        alias: 'k',
        description: 'ZAP API key',
        type: 'string',
        default: '',
      })
      .option('name', {
        alias: 'N',
        description: 'PM2 process name',
        type: 'string',
        default: 'zap-daemon',
      });
  },

  handler: async (argv: Arguments & StartDaemonOptions) => {
    try {
      await startDaemon(argv);
    } catch (err: any) {
      console.error(chalk.red(err.message));
      process.exit(1);
    }
  },
};
