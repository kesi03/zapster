import yargs from 'yargs';
import { runZapDockerScan, buildZapApiScanArgs } from './dockerScan';
import { log } from '../../utils/logger';

interface ApiScanArgs {
  target: string;
  format: string;
  configFile?: string;
  configPath?: string;
  apiFolder?: string;
  configUrl?: string;
  genFile?: string;
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
  minLevel?: string;
  contextFile?: string;
  progressFile?: string;
  shortOutput?: boolean;
  safeMode?: boolean;
  timeoutMins?: number;
  user?: string;
  zapOptions?: string;
  hook?: string;
  schema?: string;
  hostOverride?: string;
  workspace?: string;
  image?: string;
  network?: string;
}

export const apiScanCommand: yargs.CommandModule = {
  command: 'api-scan',
  describe: 'Run ZAP API scan using Docker (OpenAPI, SOAP, or GraphQL)',
  builder: (yargs) => {
    return yargs
      .option('target', {
        alias: 't',
        type: 'string',
        demandOption: true,
        description: 'Target API definition URL or file, or GraphQL endpoint URL',
      })
      .option('format', {
        alias: 'f',
        type: 'string',
        demandOption: true,
        choices: ['openapi', 'soap', 'graphql'],
        description: 'API format: openapi, soap, or graphql',
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
        description: 'Include the alpha active and passive scan rules as well',
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
      .option('min-level', {
        alias: 'l',
        type: 'string',
        description: 'Minimum level to show: PASS, IGNORE, INFO, WARN or FAIL',
      })
      .option('context-file', {
        alias: 'n',
        type: 'string',
        description: 'Context file which will be loaded prior to scanning the target',
      })
      .option('progress-file', {
        alias: 'p',
        type: 'string',
        description: 'Progress file which specifies issues that are being addressed',
      })
      .option('short-output', {
        alias: 's',
        type: 'boolean',
        default: false,
        description: 'Short output format - dont show PASSes or example URLs',
      })
      .option('safe-mode', {
        alias: 'S',
        type: 'boolean',
        default: false,
        description: 'Safe mode - skip active scan and perform baseline scan only',
      })
      .option('timeout-mins', {
        alias: 'T',
        type: 'number',
        description: 'Max time in minutes to wait for ZAP to start and the scan to run',
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
      .option('schema', {
        type: 'string',
        description: 'GraphQL schema location (URL or file)',
      })
      .option('host-override', {
        alias: 'O',
        type: 'string',
        description: 'The hostname to override in the (remote) OpenAPI spec',
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
      .option('config-path', {
        type: 'string',
        description: 'Local path to mount as /zap/cfg in the container (for config files)',
      })
      .option('api-folder', {
        type: 'string',
        description: 'Local path to mount as /zap/specs in the container (for API specs)',
      });
  },
  handler: async (argv) => {
    const args = argv as unknown as ApiScanArgs;
    
    log.info('Starting ZAP API Scan via Docker...');
    log.info(`Target: ${args.target}`);
    log.info(`Format: ${args.format}`);
    
    const scriptArgs = buildZapApiScanArgs(args);
    const exitCode = await runZapDockerScan('api-scan', scriptArgs, args);
    
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
        break;
      default:
        log.error(`Scan failed with exit code: ${exitCode}`);
        process.exit(1);
    }
  },
};