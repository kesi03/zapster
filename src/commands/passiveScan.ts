import yargs from 'yargs';
import { ZapClient } from '../zap/ZapClient';

export const passiveScanCommand: yargs.CommandModule = {
  command: 'passiveScan',
  describe: 'Manage passive scanning settings',
  builder: (yargs) => {
    return yargs
      .option('enable', {
        alias: 'e',
        type: 'boolean',
        description: 'Enable passive scanning',
      })
      .option('disable', {
        alias: 'd',
        type: 'boolean',
        description: 'Disable passive scanning',
      })
      .option('status', {
        alias: 's',
        type: 'boolean',
        description: 'Show passive scan status and pending records',
      });
  },
  handler: async (argv) => {
    const zap = new ZapClient({
      host: argv.host as string,
      port: argv.port as number,
      apiKey: argv.apiKey as string | undefined,
    });

    try {
      if (argv.status) {
        const records = await zap.pscan.passiveScanRecordsToScan();
        console.log(`Passive scan records pending: ${records.count}`);
      } else if (argv.enable) {
        await zap.pscan.passiveScanEnable();
        console.log('Passive scanning enabled');
      } else if (argv.disable) {
        await zap.pscan.passiveScanDisable();
        console.log('Passive scanning disabled');
      } else {
        const records = await zap.pscan.passiveScanRecordsToScan();
        console.log(`Passive scan records pending: ${records.count}`);
      }
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  },
};
