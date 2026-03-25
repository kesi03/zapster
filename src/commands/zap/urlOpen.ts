import yargs from 'yargs';
import { ZapClient } from '../../zap/ZapClient';
import { initLoggerWithWorkspace } from '../../utils/workspace';
import { log } from '../../utils/logger';

export const urlOpenCommand: yargs.CommandModule = {
  command: 'url-open',
  describe: 'Access a URL through the ZAP proxy to add it to the Sites tree',
  builder: (yargs) => {
    return yargs
      .option('url', {
        alias: 'u',
        type: 'string',
        demandOption: true,
        description: 'URL to access through ZAP proxy',
      });
  },
  handler: async (argv) => {
    initLoggerWithWorkspace();
    const zap = new ZapClient({
      host: argv.host as string,
      port: argv.port as number,
      apiKey: argv.apiKey as string | undefined,
    });

    log.info(`Opening URL through ZAP proxy: ${argv.url}`);
    log.info(`Zap Daemon Host: ${argv.host}:${argv.port}`);

    try {
      const version = await zap.core.getVersion();
      log.info(`Connected to ZAP version: ${version}`);

      await zap.core.urlOpen(argv.url as string);
      log.success(`URL accessed through ZAP proxy: ${argv.url}`);

      const sites = await zap.core.getSites();
      log.info(`Sites in scope: ${sites.sites.join(', ') || 'none'}`);
    } catch (error: any) {
      log.error(`Error: ${error.message}`);
      process.exit(1);
    }
  },
};