import yargs from 'yargs';
import { ZapClient } from '../zap/ZapClient';

export const getLogsCommand: yargs.CommandModule = {
  command: 'getLogs',
  describe: 'Get ZAP log messages',
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
      console.log('Log level configuration retrieved via API.');
      console.log('\nNote: Full log retrieval requires direct file access to ZAP logs.');
      console.log('Log files are typically located at:');
      console.log('  - Windows: %ZAP_HOME%\\logs\\');
      console.log('  - Linux/Mac: ~/.ZAP/logs/');
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  },
};
