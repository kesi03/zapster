import yargs from 'yargs';
import { createJUnitResultsCommand } from './createJUnitResults';
import { getPdfCommand } from './getPdf';
import { createExcelReportCommand } from './createExcelReport';

export const utilsCommand: yargs.CommandModule = {
  command: 'utils',
  describe: 'Utility commands for reports and exports',
  builder: (yargs) => {
    return yargs
      .command(createJUnitResultsCommand)
      .command(getPdfCommand)
      .command(createExcelReportCommand)
      .demandCommand(1, 'Specify a utils subcommand');
  },
  handler: () => {
    yargs.showHelp();
  },
};