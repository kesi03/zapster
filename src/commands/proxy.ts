import yargs from 'yargs';
import { ZapClient } from '../zap/ZapClient';

export const proxyCommand: yargs.CommandModule = {
  command: 'proxy',
  describe: 'Manage proxy chain exclusions',
  builder: (yargs) => {
    return yargs
      .option('list', {
        alias: 'l',
        type: 'boolean',
        description: 'List excluded domains',
      })
      .option('add', {
        type: 'string',
        description: 'Add domain to exclusion list',
      })
      .option('regex', {
        type: 'boolean',
        default: false,
        description: 'Treat value as regex',
      })
      .option('disable', {
        type: 'boolean',
        default: false,
        description: 'Add as disabled',
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
        const domains = await zap.proxy.proxyChainExcludedDomains();
        console.log('Proxy chain excluded domains:');
        if (domains.excludedDomains && domains.excludedDomains.length > 0) {
          domains.excludedDomains.forEach((domain: any) => {
            console.log(`  ${domain.value} (Regex: ${domain.isRegex}, Enabled: ${domain.isEnabled})`);
          });
        } else {
          console.log('  No excluded domains');
        }
      } else if (argv.add) {
        await zap.proxy.addProxyChainExcludedDomain(
          argv.add as string,
          argv.regex as boolean,
          !(argv.disable as boolean)
        );
        console.log(`Domain added to exclusion list: ${argv.add}`);
      } else {
        console.log('Use --list or --add');
      }
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  },
};
