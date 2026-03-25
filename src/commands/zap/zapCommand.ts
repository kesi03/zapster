import yargs from 'yargs';
import { baseScanCommand } from './baseScan';
import { activeScanCommand } from './activeScan';
import { ajaxScanCommand } from './ajaxScan';
import { passiveScanCommand } from './passiveScan';
import { apiScanCommand } from './apiScan';
import { sessionCommand } from './session';
import { contextCommand } from './context';
import { usersCommand } from './users';
import { searchCommand } from './search';
import { forcedBrowseCommand } from './forcedBrowse';
import { httpSessionsCommand } from './httpSessions';
import { breakCommand } from './break';
import { proxyCommand } from './proxy';
import { configureRulesCommand } from './configureRules';
import { getReportCommand } from './getReport';
import { getAlertsCommand } from './getAlerts';
import { getVersionCommand } from './getVersion';
import { automateCommand } from './automate';
import { generatePlanCommand } from './generatePlan';
import { clientSpiderCommand } from './clientSpider';
import { sitemapScanCommand } from './sitemapScan';

export const zapCommand: yargs.CommandModule = {
  command: 'zap',
  describe: 'ZAP core scan and management commands',
  builder: (yargs) => {
    return yargs
      .command(baseScanCommand)
      .command(activeScanCommand)
      .command(ajaxScanCommand)
      .command(passiveScanCommand)
      .command(apiScanCommand)
      .command(sessionCommand)
      .command(contextCommand)
      .command(usersCommand)
      .command(searchCommand)
      .command(forcedBrowseCommand)
      .command(httpSessionsCommand)
      .command(breakCommand)
      .command(proxyCommand)
      .command(configureRulesCommand)
      .command(getReportCommand)
      .command(getAlertsCommand)
      .command(getVersionCommand)
      .command(automateCommand)
      .command(generatePlanCommand)
      .command(clientSpiderCommand)
      .command(sitemapScanCommand)
      .demandCommand(1, 'Specify a zap subcommand');
  },
  handler: () => {
    yargs.showHelp();
  },
};