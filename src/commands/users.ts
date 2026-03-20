import yargs from 'yargs';
import { ZapClient } from '../zap/ZapClient';

export const usersCommand: yargs.CommandModule = {
  command: 'users',
  describe: 'Manage users for authenticated scanning',
  builder: (yargs) => {
    return yargs
      .option('list', {
        alias: 'l',
        type: 'boolean',
        description: 'List users in a context',
      })
      .option('new', {
        alias: 'n',
        type: 'string',
        description: 'Create a new user (requires --context)',
      })
      .option('remove', {
        type: 'string',
        description: 'Remove a user by ID (requires --context)',
      })
      .option('enable', {
        type: 'string',
        description: 'Enable a user by ID (requires --context)',
      })
      .option('disable', {
        type: 'string',
        description: 'Disable a user by ID (requires --context)',
      })
      .option('context', {
        alias: 'c',
        type: 'string',
        description: 'Context name',
      })
      .option('credentials', {
        type: 'string',
        description: 'Set authentication credentials for a user (requires --context and --user-id)',
      })
      .option('user-id', {
        type: 'number',
        description: 'User ID',
      });
  },
  handler: async (argv) => {
    const zap = new ZapClient({
      host: argv.host as string,
      port: argv.port as number,
      apiKey: argv.apiKey as string | undefined,
    });

    try {
      if (argv.list && argv.context) {
        const users = await zap.users.usersList(argv.context as string);
        console.log(`Users in context "${argv.context}":`);
        if (users.userList && users.userList.length > 0) {
          users.userList.forEach((user: any) => {
            console.log(`  ID: ${user.id}, Name: ${user.name}, Enabled: ${user.enabled}`);
          });
        } else {
          console.log('  No users found');
        }
      } else if (argv.new && argv.context) {
        const result = await zap.users.newUser(argv.context as string, argv.new as string);
        console.log(`User "${argv.new}" created with ID: ${result.userId}`);
      } else if (argv.remove && argv.context) {
        await zap.users.removeUser(argv.context as string, argv.remove as string);
        console.log(`User ${argv.remove} removed`);
      } else if (argv.enable && argv.context) {
        await zap.users.setUserEnabled(argv.context as string, argv.enable as string, true);
        console.log(`User ${argv.enable} enabled`);
      } else if (argv.disable && argv.context) {
        await zap.users.setUserEnabled(argv.context as string, argv.disable as string, false);
        console.log(`User ${argv.disable} disabled`);
      } else if (argv.context && argv.userId && argv.credentials) {
        await zap.users.setAuthenticationCredentials(
          argv.context as string,
          argv.userId.toString(),
          argv.credentials as string
        );
        console.log(`Credentials set for user ${argv.userId}`);
      } else {
        console.log('Use --list (with --context), --new, --remove, --enable, --disable, or --credentials');
      }
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  },
};
