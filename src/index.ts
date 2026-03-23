import 'dotenv/config';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { getLogsCommand } from './commands/getLogs';
import { zapCommand } from './commands/zap';
import { dockerCommand } from './commands/docker';
import { azdoCommand } from './commands/azdo';
import { utilsCommand } from './commands/utils';
import { setDebug } from './utils/logger';

const debugEnabled = process.env.DEBUG === 'true';
setDebug(debugEnabled);

yargs(hideBin(process.argv))
  .scriptName('zapster')
  .usage('$0 <command> [options]')
  .demandCommand(1, 'You must provide a command')
  .recommendCommands()
  .strict()
  .command(zapCommand)
  .command(dockerCommand)
  .command(azdoCommand)
  .command(utilsCommand)
  .command(getLogsCommand)
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
  .option('debug', {
    alias: 'd',
    type: 'boolean',
    default: process.env.DEBUG === 'true',
    description: 'Enable debug logging',
  })
  .help()
  .alias('help', 'h')
  .version('1.0.0')
  .alias('version', 'v')
  .epilog('For more information, visit https://www.zaproxy.org/docs/api/')
  .middleware((argv) => {
    if (argv.debug) {
      setDebug(true);
    }
  })
  .parse();