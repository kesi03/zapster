import yargs from 'yargs';
import { ZapClient } from '../../zap/ZapClient';
import { initLoggerWithWorkspace } from '../../utils/workspace';
import { log } from '../../utils/logger';
import { createProgressBar, startProgress, updateProgress, stopProgress } from '../../utils/progress';

export const clientSpiderCommand: yargs.CommandModule = {
  command: 'client-spider',
  describe: 'Run a client spider scan to discover URLs on the target site',
  builder: (yargs) => {
    return yargs
      .option('url', {
        alias: 'u',
        type: 'string',
        demandOption: true,
        description: 'URL to scan',
      })
      .option('browser', {
        alias: 'b',
        type: 'string',
        description: 'The ID of the browser (e.g., chrome, firefox)',
      })
      .option('context-name', {
        type: 'string',
        description: 'The name of the context',
      })
      .option('user-name', {
        type: 'string',
        description: 'The name of the user',
      })
      .option('subtree-only', {
        type: 'boolean',
        default: false,
        description: 'Spider only under the subtree',
      })
      .option('max-crawl-depth', {
        type: 'number',
        description: 'Maximum crawl depth (0 is unlimited)',
      })
      .option('page-load-time', {
        type: 'number',
        description: 'Page load time in seconds',
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
    initLoggerWithWorkspace();
    const zap = new ZapClient({
      host: argv.host as string,
      port: argv.port as number,
      apiKey: argv.apiKey as string | undefined,
    });

    log.info(`Starting client spider scan on: ${argv.url}`);
    log.info(`Zap Daemon Host: ${argv.host}:${argv.port}`);

    try {
      const version = await zap.core.getVersion();
      log.info(`Connected to ZAP version: ${version}`);

      const scanId = await zap.clientSpider.clientSpiderScan(argv.url as string, {
        browser: argv.browser as string | undefined,
        contextName: argv.contextName as string | undefined,
        userName: argv.userName as string | undefined,
        subtreeOnly: argv.subtreeOnly as boolean | undefined,
        maxCrawlDepth: argv.maxCrawlDepth as number | undefined,
        pageLoadTime: argv.pageLoadTime as number | undefined,
      });

      log.info(`Scan started with ID: ${scanId}`);

      const progressBar = createProgressBar('Client Spider Scan |{bar}| {percentage}% | State: {state}');

      const startTime = Date.now();
      let status = await zap.clientSpider.clientSpiderStatus(scanId);

      startProgress(progressBar, 100, { state: status.state || 'RUNNING' });

      while (
        status.state !== 'FINISHED' &&
        status.state !== 'STOPPED' &&
        Date.now() - startTime < ((argv.timeout as number) || 300000)
      ) {
        updateProgress(progressBar, status.progress, { state: status.state || 'RUNNING' });
        if (!progressBar) {
          log.info(`Scan progress: ${status.progress}% - State: ${status.state || 'RUNNING'}`);
        }
        await new Promise((resolve) => setTimeout(resolve, (argv.pollInterval as number) || 2000));
        status = await zap.clientSpider.clientSpiderStatus(scanId);
      }

      updateProgress(progressBar, 100, { state: status.state || 'FINISHED' });
      stopProgress(progressBar);

      if (status.state === 'FINISHED') {
        log.success('Client spider scan completed successfully!');
      } else {
        log.warn(`Scan ended with status: ${status.state}`);
      }

      log.info('Fetching discovered URLs from ZAP...');
      const urls = await zap.core.getUrls();
      const targetUrls = urls.urls.filter(u => u.startsWith(argv.url as string));
      
      log.success(`Found ${targetUrls.length} URLs from client spider scan`);
      
      if (targetUrls.length > 0) {
        log.info('Discovered URLs:');
        targetUrls.forEach((url, i) => {
          log.info(`  ${i + 1}. ${url}`);
        });
      }

      const sites = await zap.core.getSites();
      log.info(`Total sites in ZAP: ${sites.sites.length}`);
      sites.sites.forEach(site => {
        if (site.includes(new URL(argv.url as string).host)) {
          log.info(`  - ${site}`);
        }
      });

    } catch (error: any) {
      log.error(`Error: ${error.message}`);
      process.exit(1);
    }
  },
};
