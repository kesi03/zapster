import yargs from 'yargs';
import { ZapClient } from '../zap/ZapClient';

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
    const zap = new ZapClient({
      host: argv.host as string,
      port: argv.port as number,
      apiKey: argv.apiKey as string | undefined,
    });

    console.log(`Starting AJAX Spider scan on: ${argv.url}`);
    console.log(`Host: ${argv.host}:${argv.port}`);

    try {
      const version = await zap.core.getVersion();
      console.log(`Connected to ZAP version: ${version}`);

      const result = await zap.ajaxSpider.ajaxSpiderScan(argv.url as string, argv.maxDuration as number | undefined);
      console.log(`Scan started`);

      const startTime = Date.now();
      let status = await zap.ajaxSpider.ajaxSpiderStatus();

      while (
        status.status !== 'STOPPED' &&
        status.status !== 'FINISHED' &&
        Date.now() - startTime < ((argv.timeout as number) || 600000)
      ) {
        console.log(`AJAX Spider status: ${status.status} - Nodes visited: ${status.nodesVisited}`);
        await new Promise((resolve) => setTimeout(resolve, (argv.pollInterval as number) || 5000));
        status = await zap.ajaxSpider.ajaxSpiderStatus();
      }

      console.log(`Final status: ${status.status}`);
      console.log(`Total nodes visited: ${status.nodesVisited}`);
      console.log('AJAX Spider scan completed!');
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  },
};
