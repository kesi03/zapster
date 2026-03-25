import yargs from 'yargs';
import * as fs from 'fs';
import { ZapClient } from '../../zap/ZapClient';
import { initLoggerWithWorkspace, getWorkspacePath } from '../../utils/workspace';
import { log } from '../../utils/logger';
import { createProgressBar, startProgress, updateProgress, stopProgress } from '../../utils/progress';

interface SiteMapData {
  baseUrl: string;
  urls: string[];
}

export const sitemapScanCommand: yargs.CommandModule = {
  command: 'sitemap-scan',
  describe: 'Run spider, passive scan, and active scan on URLs from a sitemap file',
  builder: (yargs) => {
    return yargs
      .option('file', {
        alias: 'f',
        type: 'string',
        demandOption: true,
        description: 'Path to sitemap JSON file',
      })
      .option('spider', {
        type: 'boolean',
        default: true,
        description: 'Run spider scan',
      })
      .option('pscan', {
        type: 'boolean',
        default: true,
        description: 'Run passive scan',
      })
      .option('ascan', {
        alias: 'a',
        type: 'boolean',
        default: false,
        description: 'Run active scan (vulnerability testing)',
      })
      .option('max-depth', {
        type: 'number',
        description: 'Maximum depth for spider (0 for unlimited)',
      })
      .option('max-children', {
        type: 'number',
        description: 'Limit children scanned per URL',
      })
      .option('recurse', {
        type: 'boolean',
        default: true,
        description: 'Enable recursion in spider',
      })
      .option('policy', {
        type: 'string',
        description: 'Scan policy name for active scan',
      })
      .option('poll-interval', {
        type: 'number',
        default: 2000,
        description: 'Polling interval in ms',
      })
      .option('timeout', {
        type: 'number',
        default: 600000,
        description: 'Maximum time to wait in ms',
      });
  },
  handler: async (argv) => {
    initLoggerWithWorkspace();

    const filePathArg = argv.file as string;
    const filePath = filePathArg.startsWith('/') || filePathArg.match(/^[a-zA-Z]:/)
      ? filePathArg
      : getWorkspacePath(filePathArg);

    if (!fs.existsSync(filePath)) {
      log.error(`Sitemap file not found: ${filePath}`);
      process.exit(1);
    }

    const sitemapData: SiteMapData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const urls = sitemapData.urls || [];

    if (urls.length === 0) {
      log.error('No URLs found in sitemap file');
      process.exit(1);
    }

    log.info(`Loaded ${urls.length} URLs from sitemap`);
    log.info(`Base URL: ${sitemapData.baseUrl}`);

    const zap = new ZapClient({
      host: argv.host as string,
      port: argv.port as number,
      apiKey: argv.apiKey as string | undefined,
    });

    try {
      const version = await zap.core.getVersion();
      log.info(`Connected to ZAP version: ${version}`);

      const spiderEnabled = argv.spider as boolean;
      const pscanEnabled = argv.pscan as boolean;
      const ascanEnabled = argv.ascan as boolean;

      if (spiderEnabled) {
        log.info('Starting spider scan on all URLs...');
        for (const url of urls) {
          try {
            log.info(`Spidering: ${url}`);
            await zap.spider.spiderScan(
              url,
              argv.maxDepth as number | undefined,
              argv.maxChildren as number | undefined,
              argv.recurse as boolean | undefined
            );
          } catch (err: any) {
            log.warn(`Spider error for ${url}: ${err.message}`);
          }
        }
        log.success('Spider scans initiated');
      }

      if (pscanEnabled) {
        log.info('Passive scanning is always enabled for URLs accessed through ZAP');
      }

      if (ascanEnabled) {
        log.info('Starting active scan on all URLs...');
        const progressBar = createProgressBar('Active Scan |{bar}| {percentage}% | {current}/{total}');

        const startTime = Date.now();
        let completed = 0;

        startProgress(progressBar, urls.length, { current: 0, total: urls.length });

        for (const url of urls) {
          if (Date.now() - startTime > ((argv.timeout as number) || 600000)) {
            log.warn('Timeout reached, stopping active scan');
            break;
          }

          try {
            log.info(`Active scanning: ${url}`);
            const scanId = await zap.ascan.activeScan(url, undefined, undefined, argv.policy as string | undefined);

            let status = '0';
            while (parseInt(status) < 100) {
              const statusResult = await zap.ascan.activeScanStatus(scanId) as any;
              status = statusResult.progress?.toString() || '0';
              if (status === '100') break;
              await new Promise((resolve) => setTimeout(resolve, (argv.pollInterval as number) || 2000));
            }
          } catch (err: any) {
            log.warn(`Active scan error for ${url}: ${err.message}`);
          }

          completed++;
          updateProgress(progressBar, completed, { current: completed, total: urls.length });
        }

        stopProgress(progressBar);
        log.success(`Active scan completed for ${completed} URLs`);
      }

      log.success('All scans completed!');
      log.info(`Spider: ${spiderEnabled ? 'enabled' : 'disabled'}`);
      log.info(`Passive Scan: ${pscanEnabled ? 'enabled' : 'disabled'}`);
      log.info(`Active Scan: ${ascanEnabled ? 'enabled' : 'disabled'}`);

      const alerts = await zap.alerts.getAlerts(sitemapData.baseUrl);
      log.success(`Found ${alerts.alerts.length} alerts`);

      const summary = await zap.alerts.getAlertsSummary();
      log.info('Alert Summary:');
      log.info(`  High: ${summary.RiskConf?.High || 0}`);
      log.info(`  Medium: ${summary.RiskConf?.Medium || 0}`);
      log.info(`  Low: ${summary.RiskConf?.Low || 0}`);
      log.info(`  Informational: ${summary.RiskConf?.Informational || 0}`);

    } catch (error: any) {
      log.error(`Error: ${error.message}`);
      process.exit(1);
    }
  },
};