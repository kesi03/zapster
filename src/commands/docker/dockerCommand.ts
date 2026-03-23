import yargs from 'yargs';
import { baselineScanCommand } from './baselineScan';
import { fullScanCommand } from './fullScan';
import { apiScanCommand } from './apiScan';
import { pullImageCommand } from './pullImage';

export const dockerCommand: yargs.CommandModule = {
  command: 'docker',
  describe: 'Docker-based ZAP scan commands',
  builder: (yargs) => {
    return yargs
      .command(baselineScanCommand)
      .command(fullScanCommand)
      .command(apiScanCommand)
      .command(pullImageCommand)
      .demandCommand(1, 'Specify a docker subcommand: baseline-scan, full-scan, api-scan, or pull');
  },
  handler: () => {
    yargs.showHelp();
  },
};