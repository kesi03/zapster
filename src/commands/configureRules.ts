import yargs from 'yargs';
import { ZapClient } from '../zap/ZapClient';

export const configureRulesCommand: yargs.CommandModule = {
  command: 'configureRules',
  describe: 'Configure ZAP scanning rules and policies',
  builder: (yargs) => {
    return yargs
      .option('list', {
        alias: 'l',
        type: 'boolean',
        description: 'List all rule configurations',
      })
      .option('reset', {
        type: 'boolean',
        description: 'Reset a specific rule config (requires --scanner-id)',
      })
      .option('reset-all', {
        type: 'boolean',
        description: 'Reset all rule configurations to defaults',
      })
      .option('scanner-id', {
        type: 'number',
        description: 'Scanner ID for configuration',
      })
      .option('threshold', {
        type: 'string',
        description: 'Alert threshold (OFF, DEFAULT, LO, MEDIUM, HIGH)',
      })
      .option('strength', {
        type: 'string',
        description: 'Attack strength (DEFAULT, INSANE, LOW, MEDIUM, HIGH)',
      })
      .option('policy-name', {
        type: 'string',
        description: 'Scan policy name',
      });
  },
  handler: async (argv) => {
    const zap = new ZapClient({
      host: argv.host as string,
      port: argv.port as number,
      apiKey: argv.apiKey as string | undefined,
    });

    try {
      if (argv.list) {
        console.log('Rule Configurations:');
        const configs = await zap.core.getAllRuleConfigs();
        console.log(JSON.stringify(configs, null, 2));
      } else if (argv['reset-all']) {
        await zap.core.resetAllRuleConfigValues();
        console.log('All rule configurations reset to defaults');
      } else if (argv.reset && argv['scanner-id']) {
        await zap.core.resetRuleConfigValue(`ascan.scanner.${argv['scanner-id']}.threshold`);
        console.log(`Rule ${argv['scanner-id']} reset to default`);
      } else if (argv['scanner-id'] && argv.threshold) {
        await zap.ascan.setScannerAlertThreshold(argv['scanner-id'] as number, argv.threshold as string, argv['policy-name'] as string | undefined);
        console.log(`Scanner ${argv['scanner-id']} threshold set to ${argv.threshold}`);
      } else if (argv['scanner-id'] && argv.strength) {
        await zap.ascan.setScannerAttackStrength(argv['scanner-id'] as number, argv.strength as string, argv['policy-name'] as string | undefined);
        console.log(`Scanner ${argv['scanner-id']} strength set to ${argv.strength}`);
      } else {
        console.log('No action specified. Use --list, --reset, --reset-all, or provide --scanner-id with --threshold or --strength');
        const configs = await zap.core.getAllRuleConfigs();
        console.log('\nCurrent Rule Configurations:');
        console.log(JSON.stringify(configs, null, 2));
      }
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  },
};
