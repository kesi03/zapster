import yargs from 'yargs';
import { ZapClient } from '../zap/ZapClient';
import { initLoggerWithWorkspace } from '../utils/workspace';
import { log } from '../utils/logger';
import { createProgressBar, startProgress, updateProgress, stopProgress } from '../utils/progress';

export const ajaxScanCommand: yargs.CommandModule = {
  command: 'ajaxScan',
  describe: 'Run an AJAX Spider scan using a browser',
  builder: (yargs) => {
    return yargs
      .option('url', {
        alias: 'u',
        type: 'string',
        demandOption: true,
        description: 'URL to scan',
      })
      .option('max-duration', {
        type: 'number',
        description: 'Maximum duration in minutes (0 for unlimited)',
      })
      .option('max-crawl-depth', {
        type: 'number',
        description: 'Maximum crawl depth',
      })
      .option('max-crawl-states', {
        type: 'number',
        description: 'Maximum number of states to crawl',
      })
      .option('browser-id', {
        type: 'string',
        description: 'Browser ID to use (e.g., firefox, chrome, chrome-headless)',
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

    log.info(`Starting AJAX Spider scan on: ${argv.url}`);
    log.info(`Zap Daemon Host: ${argv.host}:${argv.port}`);

    try {
      const version = await zap.core.getVersion();
      log.info(`Connected to ZAP version: ${version}`);

      const result = await zap.ajaxSpider.ajaxSpiderScan(argv.url as string, argv.maxDuration as number | undefined);
      log.info('Scan started');

      const progressBar = createProgressBar('AJAX Spider |{bar}| {percentage}% | Nodes: {nodes} | Status: {state}');

      const startTime = Date.now();
      let status = await zap.ajaxSpider.ajaxSpiderStatus();
      const maxDuration = (argv.maxDuration as number) || 0;

      startProgress(progressBar, maxDuration > 0 ? maxDuration * 60 : 100, { state: status.status, nodes: status.nodesVisited });

      while (
        status.status.toUpperCase() !== 'STOPPED' &&
        status.status.toUpperCase() !== 'FINISHED' &&
        Date.now() - startTime < ((argv.timeout as number) || 600000)
      ) {
        const elapsedMinutes = Math.floor((Date.now() - startTime) / 60000);
        const progressValue = maxDuration > 0 ? Math.min(elapsedMinutes, maxDuration * 60) : elapsedMinutes;
        updateProgress(progressBar, progressValue, { state: status.status, nodes: status.nodesVisited });
        if (!progressBar) {
          log.info(`AJAX Spider status: ${status.status} - Nodes visited: ${status.nodesVisited}`);
        }
        await new Promise((resolve) => setTimeout(resolve, (argv.pollInterval as number) || 5000));
        status = await zap.ajaxSpider.ajaxSpiderStatus();
      }

      stopProgress(progressBar);

      log.info(`Final status: ${status.status}`);
      log.info(`Total nodes visited: ${status.nodesVisited}`);
      log.success('AJAX Spider scan completed!');
    } catch (error: any) {
      log.error(`Error: ${error.message}`);
      process.exit(1);
    }
  },
};
