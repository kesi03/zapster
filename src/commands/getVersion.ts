import yargs from 'yargs';
import { ZapClient } from '../zap/ZapClient';

export const getVersionCommand: yargs.CommandModule = {
  command: 'getVersion',
  describe: 'Get ZAP version',
  builder: (yargs) => {
    return yargs;
  },
  handler: async (argv) => {
    const zap = new ZapClient({
      host: argv.host as string,
      port: argv.port as number,
      apiKey: argv.apiKey as string | undefined,
    });

    try {
      const version = await zap.core.getVersion();
      console.log(`ZAP Version: ${version}`);
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  },
};
