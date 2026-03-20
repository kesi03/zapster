import yargs from 'yargs';
import { ZapClient } from '../zap/ZapClient';

export const activeScanCommand: yargs.CommandModule = {
  command: 'activeScan',
  describe: 'Run an active scan with vulnerability testing',
  builder: (yargs) => {
    return yargs
      .option('url', {
        alias: 'u',
        type: 'string',
        demandOption: true,
        description: 'URL to scan',
      })
      .option('context', {
        alias: 'c',
        type: 'string',
        description: 'Context name for authenticated scanning',
      })
      .option('user-id', {
        type: 'number',
        description: 'User ID for authenticated scanning',
      })
      .option('policy', {
        type: 'string',
        description: 'Scan policy name',
      })
      .option('poll-interval', {
        type: 'number',
        default: 5000,
        description: 'Polling interval in ms to check scan status',
      })
      .option('timeout', {
        type: 'number',
        default: 600000,
        description: 'Maximum time to wait for scan to complete in ms',
      });
  },
  handler: async (argv) => {
    const zap = new ZapClient({
      host: argv.host as string,
      port: argv.port as number,
      apiKey: argv.apiKey as string | undefined,
    });

    console.log(`Starting active scan on: ${argv.url}`);
    console.log(`Host: ${argv.host}:${argv.port}`);

    try {
      const version = await zap.core.getVersion();
      console.log(`Connected to ZAP version: ${version}`);

      const result = await zap.ascan.activeScan(
        argv.url as string,
        argv.context as string | undefined,
        argv.userId as number | undefined,
        argv.policy as string | undefined
      );

      const scanId = result.scan;
      console.log(`Scan started with ID: ${scanId}`);

      const startTime = Date.now();
      let scan = await zap.ascan.activeScanStatus(scanId) as any;

      while (
        scan.state !== 'FINISHED' &&
        scan.state !== 'STOPPED' &&
        scan.state !== 'PAUSED' &&
        Date.now() - startTime < ((argv.timeout as number) || 600000)
      ) {
        console.log(`Scan progress: ${scan.progress}% - Status: ${scan.state}`);
        await new Promise((resolve) => setTimeout(resolve, (argv.pollInterval as number) || 5000));
        scan = await zap.ascan.activeScanStatus(scanId) as any;
      }

      console.log(`Final status: ${scan.state}`);
      console.log('Active scan completed!');

      const alerts = await zap.alerts.getAlerts(argv.url as string);
      console.log(`Found ${alerts.alerts.length} alerts`);

      const summary = await zap.alerts.getAlertsSummary();
      console.log('\nAlert Summary:');
      console.log(`  High: ${summary.RiskConf.High || 0}`);
      console.log(`  Medium: ${summary.RiskConf.Medium || 0}`);
      console.log(`  Low: ${summary.RiskConf.Low || 0}`);
      console.log(`  Informational: ${summary.RiskConf.Informational || 0}`);
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  },
};
