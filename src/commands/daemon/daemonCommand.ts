import yargs from 'yargs';
import {
  startDaemonCommand,
  autostartDaemonCommand,
  stopDaemonCommand,
  logsDaemonCommand,
  statusDaemonCommand,
  pingDaemonCommand,
  healthDaemonCommand,
  checkStartedDaemonCommand,
} from './index';

export const daemonCommand = {
  command: 'daemon',
  describe: 'Manage ZAP daemon',
  builder: (yargs: yargs.Argv) => {
    return yargs
      .command(startDaemonCommand)
      .command(autostartDaemonCommand)
      .command(stopDaemonCommand)
      .command(logsDaemonCommand)
      .command(statusDaemonCommand)
      .command(pingDaemonCommand)
      .command(healthDaemonCommand)
      .command(checkStartedDaemonCommand)
      .demandCommand(1, 'You must provide a sub-command');
  },
  handler: () => {
    // Default handler - show help
  },
};
