import yargs from 'yargs';
import { runZapDockerScan, buildZapBaselineArgs, loadDockerConfig, resolveDockerOptions } from './dockerScan';
import { log } from '../../utils/logger';
import { DEFAULT_JAVA_OPTIONS } from '../../utils/constants';

interface BaselineScanArgs {
  toml?: string;
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
  name?: string;
  maxResponseSize?: number;
  dbCacheSize?: number;
  dbRecoveryLog?: boolean;
  javaOptions?: string;
  apiKey?: string;
  failOnWarn?: boolean;
}

export const baselineScanCommand: yargs.CommandModule = {
  command: 'baseline-scan',
  describe: 'Run ZAP baseline scan using Docker (passive scan, no active attacks)',
  builder: (yargs) => {
    return yargs
      .option('toml', {
        alias: 't',
        type: 'string',
        description: 'Path to zap-docker.toml configuration file',
      })
      .option('target', {
        alias: 't',
        type: 'string',
        demandOption: true,
        description: 'Target URL including the protocol, eg https://www.example.com',
      })
      .option('config-file', {
        alias: 'c',
        type: 'string',
        description: 'Config file to use to INFO, IGNORE or FAIL warnings',
      })
      .option('config-url', {
        alias: 'u',
        type: 'string',
        description: 'URL of config file to use to INFO, IGNORE or FAIL warnings',
      })
      .option('gen-file', {
        alias: 'g',
        type: 'string',
        description: 'Generate default config file (all rules set to WARN)',
      })
      .option('spider-mins', {
        alias: 'm',
        type: 'number',
        description: 'The number of minutes to spider for (default 1)',
      })
      .option('report-html', {
        alias: 'r',
        type: 'string',
        description: 'File to write the full ZAP HTML report',
      })
      .option('report-md', {
        alias: 'w',
        type: 'string',
        description: 'File to write the full ZAP Wiki (Markdown) report',
      })
      .option('report-xml', {
        alias: 'x',
        type: 'string',
        description: 'File to write the full ZAP XML report',
      })
      .option('report-json', {
        alias: 'J',
        type: 'string',
        description: 'File to write the full ZAP JSON document',
      })
      .option('include-alpha', {
        alias: 'a',
        type: 'boolean',
        default: false,
        description: 'Include the alpha passive scan rules as well',
      })
      .option('debug', {
        alias: 'd',
        type: 'boolean',
        default: false,
        description: 'Show debug messages',
      })
      .option('port', {
        alias: 'P',
        type: 'number',
        description: 'Specify listen port',
      })
      .option('delay-secs', {
        alias: 'D',
        type: 'number',
        description: 'Delay in seconds to wait for passive scanning',
      })
      .option('default-rules-info', {
        alias: 'i',
        type: 'boolean',
        default: false,
        description: 'Default rules not in the config file to INFO',
      })
      .option('ignore-warning', {
        alias: 'I',
        type: 'boolean',
        default: false,
        description: 'Do not return failure on warning',
      })
      .option('ajax-spider', {
        alias: 'j',
        type: 'boolean',
        default: false,
        description: 'Use the Ajax spider in addition to the traditional one',
      })
      .option('min-level', {
        alias: 'l',
        type: 'string',
        description: 'Minimum level to show: PASS, IGNORE, INFO, WARN or FAIL',
      })
      .option('context-file', {
        alias: 'n',
        type: 'string',
        description: 'Context file which will be loaded prior to spidering the target',
      })
      .option('progress-file', {
        type: 'string',
        description: 'Progress file which specifies issues that are being addressed',
      })
      .option('short-output', {
        alias: 's',
        type: 'boolean',
        default: false,
        description: 'Short output format - dont show PASSes or example URLs',
      })
      .option('timeout-mins', {
        alias: 'T',
        type: 'number',
        description: 'Max time in minutes to wait for ZAP to start and the passive scan to run',
      })
      .option('user', {
        alias: 'U',
        type: 'string',
        description: 'Username to use for authenticated scans',
      })
      .option('zap-options', {
        alias: 'z',
        type: 'string',
        description: 'ZAP command line options e.g. -z "-config aaa=bbb -config ccc=ddd"',
      })
      .option('hook', {
        type: 'string',
        description: 'Path to python file that define your custom hooks',
      })
      .option('auto', {
        type: 'boolean',
        default: false,
        description: 'Use the automation framework if supported',
      })
      .option('autooff', {
        type: 'boolean',
        default: false,
        description: 'Do not use the automation framework even if supported',
      })
      .option('plan-only', {
        type: 'boolean',
        default: false,
        description: 'Generate an automation framework plan but do not run it',
      })
      .option('workspace', {
        alias: 'w',
        type: 'string',
        description: 'Workspace directory for output files',
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
      })
      .option('fail-on-warn', {
        alias: 'W',
        type: 'boolean',
        default: false,
        description: 'Return failure exit code on warning',
      });
  },
  handler: async (argv) => {
    const args = argv as unknown as BaselineScanArgs;
    
    const { config, useToml } = loadDockerConfig(args);
    const dockerOpts = resolveDockerOptions(args, config, useToml);
    
    const mergedArgs = {
      ...args,
      ...dockerOpts,
      javaOptions: args.javaOptions || dockerOpts.javaOptions || DEFAULT_JAVA_OPTIONS.join(' '),
    };
    
    log.info('Starting ZAP Baseline Scan via Docker...');
    log.info(`Target: ${args.target}`);
    if (useToml) {
      log.info(`Config: TOML (${args.toml})`);
    }
    
    const scriptArgs = buildZapBaselineArgs(mergedArgs);
    const exitCode = await runZapDockerScan('baseline-scan', scriptArgs, mergedArgs);
    
    log.info(`Scan completed with exit code: ${exitCode}`);
    
    switch (exitCode) {
      case 0:
        log.success('Scan completed successfully - no issues found');
        break;
      case 1:
        log.error('Scan completed with FAIL - at least one rule failed');
        process.exit(1);
      case 2:
        log.warn('Scan completed with WARN - no failures but warnings found');
        if (args.failOnWarn) {
          process.exit(1);
        }
        break;
      default:
        log.error(`Scan failed with exit code: ${exitCode}`);
        process.exit(1);
    }
  },
};