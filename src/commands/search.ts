import yargs from 'yargs';
import { ZapClient } from '../zap/ZapClient';

export const searchCommand: yargs.CommandModule = {
  command: 'search',
  describe: 'Search ZAP URLs and messages by regex',
  builder: (yargs) => {
    return yargs
      .option('regex', {
        alias: 'r',
        type: 'string',
        demandOption: true,
        description: 'Regular expression to search for',
      })
      .option('urls', {
        alias: 'u',
        type: 'boolean',
        description: 'Search URLs matching regex',
      })
      .option('messages', {
        alias: 'm',
        type: 'boolean',
        description: 'Search HTTP messages matching regex',
      });
  },
  handler: async (argv) => {
    const zap = new ZapClient({
      host: argv.host as string,
      port: argv.port as number,
      apiKey: argv.apiKey as string | undefined,
    });

    const regex = argv.regex as string;

    try {
      if (argv.urls) {
        const results = await zap.search.urlsByRegex(regex) as { urls: string[] };
        console.log(`URLs matching "${regex}":`);
        if (results.urls && results.urls.length > 0) {
          results.urls.forEach((url: string) => console.log(`  ${url}`));
        } else {
          console.log('  No URLs found');
        }
      } else if (argv.messages) {
        const results = await zap.search.messagesByRegex(regex);
        console.log(`Messages matching "${regex}":`);
        if (results.messages && (results.messages as any[]).length > 0) {
          console.log(`  Found ${(results.messages as any[]).length} messages`);
        } else {
          console.log('  No messages found');
        }
      } else {
        console.log('Use --urls or --messages');
      }
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  },
};
