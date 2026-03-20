import 'dotenv/config';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { baseScanCommand } from './commands/baseScan';
import { passiveScanCommand } from './commands/passiveScan';
import { activeScanCommand } from './commands/activeScan';
import { ajaxScanCommand } from './commands/ajaxScan';
import { getReportCommand } from './commands/getReport';
import { getAlertsCommand } from './commands/getAlerts';
import { getLogsCommand } from './commands/getLogs';
import { createJUnitResultsCommand } from './commands/createJUnitResults';
import { createTestResultCommand } from './commands/createTestResult';
import { createWorkItemCommand } from './commands/createWorkItem';
import { configureRulesCommand } from './commands/configureRules';
import { getVersionCommand } from './commands/getVersion';
import { sessionCommand } from './commands/session';
import { contextCommand } from './commands/context';
import { usersCommand } from './commands/users';
import { searchCommand } from './commands/search';
import { forcedBrowseCommand } from './commands/forcedBrowse';

yargs(hideBin(process.argv))
  .scriptName('zapster')
  .usage('$0 <command> [options]')
  .demandCommand(1, 'You must provide a command')
  .recommendCommands()
  .strict()
  .command(baseScanCommand)
  .command(passiveScanCommand)
  .command(activeScanCommand)
  .command(ajaxScanCommand)
  .command(getReportCommand)
  .command(getAlertsCommand)
  .command(getLogsCommand)
  .command(createJUnitResultsCommand)
  .command(createTestResultCommand)
  .command(createWorkItemCommand)
  .command(configureRulesCommand)
  .command(getVersionCommand)
  .command(sessionCommand)
  .command(contextCommand)
  .command(usersCommand)
  .command(searchCommand)
  .command(forcedBrowseCommand)
  .option('host', {
    alias: 'H',
    type: 'string',
    default: process.env.ZAP_HOST || 'localhost',
    description: 'ZAP API host',
  })
  .option('port', {
    alias: 'p',
    type: 'number',
    default: Number.parseInt(process.env.ZAP_PORT || '8080', 10),
    description: 'ZAP API port',
  })
  .option('api-key', {
    alias: 'k',
    type: 'string',
    default: process.env.ZAP_API_KEY,
    description: 'ZAP API key',
  })
  .help()
  .alias('help', 'h')
  .version('1.0.0')
  .alias('version', 'v')
  .epilog('For more information, visit https://www.zaproxy.org/docs/api/')
  .parse();
