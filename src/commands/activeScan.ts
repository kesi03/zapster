import yargs from 'yargs';
import { ZapClient } from '../zap/ZapClient';
import { initLoggerWithWorkspace } from '../utils/workspace';
import { log } from '../utils/logger';
import { createProgressBar, startProgress, updateProgress, stopProgress } from '../utils/progress';

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
    initLoggerWithWorkspace();
    const zap = new ZapClient({
      host: argv.host as string,
      port: argv.port as number,
      apiKey: argv.apiKey as string | undefined,
    });

    log.info(`Starting active scan on: ${argv.url}`);
    log.info(`Zap DaemonHost: ${argv.host}:${argv.port}`);

    try {
      const version = await zap.core.getVersion();
      log.info(`Connected to ZAP version: ${version}`);

      log.info('Adding URL to scan tree...');
      try {
        await zap.core.accessUrl(argv.url as string);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (err) {
        log.warn('Could not add URL to scan tree, attempting scan anyway...');
      }

      const scanId = await zap.ascan.activeScan(
        argv.url as string,
        argv.context as string | undefined,
        argv.userId as number | undefined,
        argv.policy as string | undefined
      );

      log.info(`Scan started with ID: ${scanId}`);

      const progressBar = createProgressBar('Active Scan |{bar}| {percentage}% | Status: {state}');

      const startTime = Date.now();
      let scan = await zap.ascan.activeScanStatus(scanId) as any;

      startProgress(progressBar, 100, { state: scan.state || 'RUNNING' });

      while (
        scan.state !== 'FINISHED' &&
        scan.state !== 'STOPPED' &&
        scan.state !== 'PAUSED' &&
        Date.now() - startTime < ((argv.timeout as number) || 600000)
      ) {
        updateProgress(progressBar, scan.progress || 0, { state: scan.state || 'RUNNING' });
        if (!progressBar) {
          log.info(`Scan progress: ${scan.progress || 0}% - Status: ${scan.state || 'RUNNING'}`);
        }
        await new Promise((resolve) => setTimeout(resolve, (argv.pollInterval as number) || 5000));
        scan = await zap.ascan.activeScanStatus(scanId) as any;
      }

      updateProgress(progressBar, 100, { state: scan.state || 'FINISHED' });
      stopProgress(progressBar);

      log.info(`Final status: ${scan.state}`);
      log.success('Active scan completed!');

      const alerts = await zap.alerts.getAlerts(argv.url as string);
      log.info(`Found ${alerts.alerts.length} alerts`);

      const summary = await zap.alerts.getAlertsSummary();
      const riskConf = summary.RiskConf || summary || {};
      log.info('Alert Summary:');
      log.info(`  High: ${riskConf.High || 0}`);
      log.info(`  Medium: ${riskConf.Medium || 0}`);
      log.info(`  Low: ${riskConf.Low || 0}`);
      log.info(`  Informational: ${riskConf.Informational || 0}`);
    } catch (error: any) {
      log.error(`Error: ${error.message}`);
      process.exit(1);
    }
  },
};
