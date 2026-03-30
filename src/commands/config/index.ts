import { generateTomlCommand } from './generateToml';

export const configCommand = {
  command: 'config',
  describe: 'Configuration utilities',
  builder: (yargs: any) => {
    return yargs
      .command(generateTomlCommand)
      .demandCommand(1, 'You must specify a subcommand');
  },
  handler: () => {},
};
