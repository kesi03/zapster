import yargs from 'yargs';
import * as fs from 'fs';
import * as path from 'path';
import { ZapClient } from '../zap/ZapClient';

export const getAlertsCommand: yargs.CommandModule = {
  command: 'getAlerts',
  describe: 'Get ZAP alerts with optional filtering',
  builder: (yargs) => {
    return yargs
      .option('base-url', {
        alias: 'u',
        type: 'string',
        description: 'Filter alerts by base URL',
      })
      .option('start', {
        type: 'number',
        default: 0,
        description: 'Start index for pagination',
      })
      .option('count', {
        type: 'number',
        description: 'Maximum number of alerts to return',
      })
      .option('output', {
        alias: 'o',
        type: 'string',
        description: 'Output file path (JSON)',
      })
      .option('summary', {
        alias: 's',
        type: 'boolean',
        description: 'Show alerts summary by risk level',
      });
  },
  handler: async (argv) => {
    const zap = new ZapClient({
      host: argv.host as string,
      port: argv.port as number,
      apiKey: argv.apiKey as string | undefined,
    });

    try {
      if (argv.summary) {
        const summary = await zap.alerts.getAlertsSummary();
        console.log('Alerts Summary:');
        console.log(`  High: ${summary.RiskConf?.High || 0}`);
        console.log(`  Medium: ${summary.RiskConf?.Medium || 0}`);
        console.log(`  Low: ${summary.RiskConf?.Low || 0}`);
        console.log(`  Informational: ${summary.RiskConf?.Informational || 0}`);
        console.log(`  False Positive: ${summary.RiskConf?.FalsePositive || 0}`);
      } else {
        const response = await zap.alerts.getAlerts(
          argv.baseUrl as string | undefined,
          argv.start as number | undefined,
          argv.count as number | undefined
        );

        console.log(`Found ${response.alerts.length} alerts`);

        if (argv.output) {
          const outputPath = path.resolve(argv.output as string);
          fs.mkdirSync(path.dirname(outputPath), { recursive: true });
          fs.writeFileSync(outputPath, JSON.stringify(response.alerts, null, 2), 'utf-8');
          console.log(`Alerts saved to: ${outputPath}`);
        } else {
          response.alerts.forEach((alert) => {
            console.log(`\n[${alert.risk}] ${alert.alert}`);
            console.log(`  URL: ${alert.url}`);
            console.log(`  Parameter: ${alert.param}`);
            console.log(`  Solution: ${alert.solution || 'N/A'}`);
          });
        }
      }
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  },
};
