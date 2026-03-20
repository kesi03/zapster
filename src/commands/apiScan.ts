import yargs from 'yargs';
import * as fs from 'fs';
import * as path from 'path';
import { ZapClient } from '../zap/ZapClient';

export const apiScanCommand: yargs.CommandModule = {
  command: 'apiScan',
  describe: 'Run a full API scan (spider + passive + active) in one command',
  builder: (yargs) => {
    return yargs
      .option('url', {
        alias: 'u',
        type: 'string',
        demandOption: true,
        description: 'Target URL to scan',
      })
      .option('recurse', {
        type: 'boolean',
        default: true,
        description: 'Recurse into found URLs',
      })
      .option('in-scope-only', {
        type: 'boolean',
        default: false,
        description: 'Only scan URLs in scope',
      })
      .option('context', {
        alias: 'c',
        type: 'string',
        description: 'Context name',
      })
      .option('policy', {
        type: 'string',
        description: 'Scan policy name',
      })
      .option('method', {
        type: 'string',
        description: 'HTTP method to use',
      })
      .option('post-data', {
        type: 'string',
        description: 'POST data to send',
      })
      .option('poll-interval', {
        type: 'number',
        default: 5000,
        description: 'Polling interval in ms to check status',
      })
      .option('timeout', {
        type: 'number',
        default: 600000,
        description: 'Maximum time to wait in ms',
      })
      .option('output', {
        alias: 'o',
        type: 'string',
        description: 'Output file path for JSON report',
      })
      .option('format', {
        alias: 'f',
        type: 'string',
        choices: ['json', 'html'],
        default: 'json',
        description: 'Report format',
      });
  },
  handler: async (argv) => {
    const zap = new ZapClient({
      host: argv.host as string,
      port: argv.port as number,
      apiKey: argv.apiKey as string | undefined,
    });

    console.log(`Starting API scan on: ${argv.url}`);
    console.log(`Host: ${argv.host}:${argv.port}`);

    try {
      const version = await zap.core.getVersion();
      console.log(`Connected to ZAP version: ${version}`);

      const result = await zap.apiScan.scan({
        url: argv.url as string,
        recurse: argv.recurse as boolean,
        inScopeOnly: argv['in-scope-only'] as boolean,
        contextName: argv.context as string | undefined,
        scanPolicyName: argv.policy as string | undefined,
        method: argv.method as string | undefined,
        postData: argv.postData as string | undefined,
      });

      const scanId = result.scan;
      console.log(`API scan started with ID: ${scanId}`);

      const startTime = Date.now();
      let status = '0';

      while (parseInt(status) < 100 && Date.now() - startTime < ((argv.timeout as number) || 600000)) {
        const statusResult = await zap.apiScan.status(scanId);
        status = statusResult.status;
        console.log(`Scan progress: ${status}%`);
        
        if (status === '100') break;
        
        await new Promise((resolve) => setTimeout(resolve, (argv.pollInterval as number) || 5000));
      }

      console.log('API scan completed!');

      if (argv.output) {
        const outputPath = path.resolve(argv.output as string);
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });

        if ((argv.format as string) === 'html') {
          const htmlReport = await zap.apiScan.htmlReport();
          fs.writeFileSync(outputPath, htmlReport, 'utf-8');
        } else {
          const jsonReport = await zap.apiScan.jsonReport();
          fs.writeFileSync(outputPath, JSON.stringify(jsonReport, null, 2), 'utf-8');
        }
        console.log(`Report saved to: ${outputPath}`);
      }

      const alerts = await zap.alerts.getAlerts(argv.url as string);
      console.log(`\nFound ${alerts.alerts.length} alerts`);

      const summary = await zap.alerts.getAlertsSummary();
      console.log('\nAlert Summary:');
      console.log(`  High: ${summary.RiskConf?.High || 0}`);
      console.log(`  Medium: ${summary.RiskConf?.Medium || 0}`);
      console.log(`  Low: ${summary.RiskConf?.Low || 0}`);
      console.log(`  Informational: ${summary.RiskConf?.Informational || 0}`);
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  },
};
