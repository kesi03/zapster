import yargs from 'yargs';
import { ZapClient } from '../zap/ZapClient';

export const baseScanCommand: yargs.CommandModule = {
  command: 'baseScan',
  describe: 'Run a spider scan to discover URLs on the target site',
  builder: (yargs) => {
    return yargs
      .option('url', {
        alias: 'u',
        type: 'string',
        demandOption: true,
        description: 'URL to scan',
      })
      .option('max-depth', {
        type: 'number',
        description: 'Maximum depth the spider can crawl (0 for unlimited)',
      })
      .option('max-children', {
        type: 'number',
        description: 'Limit the number of children scanned (0 for unlimited)',
      })
      .option('recurse', {
        type: 'boolean',
        default: true,
        description: 'Enable recursion into found URLs',
      })
      .option('poll-interval', {
        type: 'number',
        default: 2000,
        description: 'Polling interval in ms to check scan status',
      })
      .option('timeout', {
        type: 'number',
        default: 300000,
        description: 'Maximum time to wait for scan to complete in ms',
      });
  },
  handler: async (argv) => {
    const zap = new ZapClient({
      host: argv.host as string,
      port: argv.port as number,
      apiKey: argv.apiKey as string | undefined,
    });

    console.log(`Starting spider scan on: ${argv.url}`);
    console.log(`Host: ${argv.host}:${argv.port}`);

    try {
      const version = await zap.core.getVersion();
      console.log(`Connected to ZAP version: ${version}`);

      const result = await zap.spider.spiderScan(
        argv.url as string,
        argv.maxDepth as number | undefined,
        argv.maxChildren as number | undefined,
        argv.recurse as boolean | undefined
      ) as { scan: string };

      const scanId = result.scan;
      console.log(`Scan started with ID: ${scanId}`);

      const startTime = Date.now();
      let status = await zap.spider.spiderStatus(scanId);

      while (
        status.state !== 'FINISHED' &&
        status.state !== 'STOPPED' &&
        Date.now() - startTime < ((argv.timeout as number) || 300000)
      ) {
        console.log(`Scan progress: ${status.progress}%`);
        await new Promise((resolve) => setTimeout(resolve, (argv.pollInterval as number) || 2000));
        status = await zap.spider.spiderStatus(scanId);
      }

      if (status.state === 'FINISHED') {
        console.log('Spider scan completed successfully!');
        const fullResults = await zap.spider.spiderFullResults(scanId);
        console.log(`Found ${fullResults.results?.length || 0} URLs`);
      } else {
        console.log(`Scan ended with status: ${status.state}`);
      }
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  },
};
