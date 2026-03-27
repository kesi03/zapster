import yargs from 'yargs';
import { baselineScanCommand } from './baselineScan';
import { fullScanCommand } from './fullScan';
import { apiScanCommand } from './apiScan';
import { pullImageCommand } from './pullImage';
import { getDockerLogCommand } from './getDockerLog';
import { startDaemonCommand, stopDaemonCommand } from './daemon';
import { dockerAutomateCommand } from './automate';

export const dockerCommand: yargs.CommandModule = {
  command: 'docker',
  describe: 'Docker-based ZAP scan commands',
  builder: (yargs) => {
    return yargs
      .command(baselineScanCommand)
      .command(fullScanCommand)
      .command(apiScanCommand)
      .command(pullImageCommand)
      .command(getDockerLogCommand)
      .command(startDaemonCommand)
      .command(stopDaemonCommand)
      .command(dockerAutomateCommand)
      .demandCommand(1, 'Specify a docker subcommand: baseline-scan, full-scan, api-scan, pull, get-docker-log, start-daemon, stop-daemon, or automate');
  },
  handler: () => {
    yargs.showHelp();
  },
};