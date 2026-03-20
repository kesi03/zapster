import yargs from 'yargs';
import { ZapClient } from '../zap/ZapClient';

export const contextCommand: yargs.CommandModule = {
  command: 'context',
  describe: 'Manage ZAP contexts (list, create, import, export)',
  builder: (yargs) => {
    return yargs
      .option('list', {
        alias: 'l',
        type: 'boolean',
        description: 'List all contexts',
      })
      .option('new', {
        alias: 'n',
        type: 'string',
        description: 'Create a new context with the given name',
      })
      .option('include', {
        type: 'string',
        description: 'Include regex in context (requires --context)',
      })
      .option('exclude', {
        type: 'string',
        description: 'Exclude regex from context (requires --context)',
      })
      .option('context', {
        alias: 'c',
        type: 'string',
        description: 'Context name',
      })
      .option('export', {
        type: 'string',
        description: 'Export context to file (requires --context)',
      })
      .option('import', {
        type: 'string',
        description: 'Import context from file',
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
        const contexts = await zap.context.contextList();
        console.log('Contexts:');
        contexts.contextList.forEach((ctx) => console.log(`  ${ctx}`));
      } else if (argv.new) {
        const result = await zap.context.newContext(argv.new as string);
        console.log(`Context created: ${argv.new} (ID: ${result.contextId})`);
      } else if (argv.context && argv.include) {
        await zap.context.includeInContext(argv.context as string, argv.include as string);
        console.log(`Included regex in context ${argv.context}: ${argv.include}`);
      } else if (argv.context && argv.exclude) {
        await zap.context.excludeFromContext(argv.context as string, argv.exclude as string);
        console.log(`Excluded regex from context ${argv.context}: ${argv.exclude}`);
      } else if (argv.export) {
        await zap.context.exportContext(argv.context as string, argv.export as string);
        console.log(`Context exported to: ${argv.export}`);
      } else if (argv.import) {
        await zap.context.importContext(argv.import as string);
        console.log(`Context imported from: ${argv.import}`);
      } else {
        console.log('Use --list, --new, --include, --exclude, --export, or --import');
      }
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  },
};
