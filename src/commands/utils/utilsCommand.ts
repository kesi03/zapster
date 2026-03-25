import yargs from 'yargs';
import { createJUnitResultsCommand } from './createJUnitResults';
import { getPdfCommand } from './getPdf';
import { createExcelReportCommand } from './createExcelReport';
import { getLogsCommand } from './getLogs';
import { getSiteMapCommand } from './getSiteMap';

export const utilsCommand: yargs.CommandModule = {
  command: 'utils',
  describe: 'Utility commands for reports and exports',
  builder: (yargs) => {
    return yargs
      .command(createJUnitResultsCommand)
      .command(getPdfCommand)
      .command(createExcelReportCommand)
      .command(getLogsCommand)
      .command(getSiteMapCommand)
      .demandCommand(1, 'Specify a utils subcommand');
  },
  handler: () => {
    yargs.showHelp();
  },
};