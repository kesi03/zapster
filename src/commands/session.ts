import yargs from 'yargs';
import { ZapClient } from '../zap/ZapClient';

export const sessionCommand: yargs.CommandModule = {
  command: 'session',
  describe: 'Manage ZAP sessions (create, save, load)',
  builder: (yargs) => {
    return yargs
      .option('new', {
        alias: 'n',
        type: 'string',
        description: 'Create a new session with the given name',
      })
      .option('save', {
        alias: 's',
        type: 'string',
        description: 'Save current session with the given name',
      })
      .option('overwrite', {
        type: 'boolean',
        default: false,
        description: 'Overwrite existing session file',
      })
      .option('sites', {
        alias: 'l',
        type: 'boolean',
        description: 'List all sites in current session',
      })
      .option('urls', {
        alias: 'u',
        type: 'boolean',
        description: 'List all URLs in current session',
      })
      .option('access-url', {
        alias: 'a',
        type: 'string',
        description: 'Access a URL and capture responses',
      });
  },
  handler: async (argv) => {
    const zap = new ZapClient({
      host: argv.host as string,
      port: argv.port as number,
      apiKey: argv.apiKey as string | undefined,
    });

    try {
      if (argv.new) {
        await zap.core.newSession(argv.new as string, argv.overwrite as boolean);
        console.log(`New session created: ${argv.new}`);
      } else if (argv.save) {
        await zap.core.saveSession(argv.save as string, argv.overwrite as boolean);
        console.log(`Session saved: ${argv.save}`);
      } else if (argv.sites) {
        const sites = await zap.core.getSites();
        console.log('Sites:');
        sites.sites.forEach((site) => console.log(`  ${site}`));
      } else if (argv.urls) {
        const urls = await zap.core.getUrls();
        console.log('URLs:');
        urls.urls.forEach((url) => console.log(`  ${url}`));
      } else if (argv.accessUrl) {
        await zap.core.accessUrl(argv.accessUrl as string);
        console.log(`Accessing URL: ${argv.accessUrl}`);
      } else {
        console.log('Use --new, --save, --sites, --urls, or --access-url');
      }
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  },
};
