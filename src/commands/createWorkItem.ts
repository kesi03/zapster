import yargs from 'yargs';
import { ZapClient } from '../zap/ZapClient';
import { AzureDevOpsService } from '../services/AzureDevOpsService';

export const createWorkItemCommand: yargs.CommandModule = {
  command: 'createWorkItem',
  describe: 'Create a work item in Azure DevOps from ZAP alerts',
  builder: (yargs) => {
    return yargs
      .option('organization', {
        alias: 'org',
        type: 'string',
        demandOption: true,
        description: 'Azure DevOps organization name',
      })
      .option('project', {
        alias: 'proj',
        type: 'string',
        demandOption: true,
        description: 'Azure DevOps project name',
      })
      .option('pat', {
        type: 'string',
        demandOption: true,
        description: 'Azure DevOps Personal Access Token',
      })
      .option('type', {
        alias: 't',
        type: 'string',
        choices: ['Bug', 'Task', 'User Story'],
        default: 'Bug',
        description: 'Work item type',
      })
      .option('title', {
        type: 'string',
        demandOption: true,
        description: 'Work item title',
      })
      .option('description', {
        alias: 'd',
        type: 'string',
        description: 'Work item description',
      })
      .option('severity', {
        type: 'string',
        description: 'Bug severity (1-4)',
      })
      .option('priority', {
        type: 'number',
        description: 'Work item priority (1-4)',
      })
      .option('area-path', {
        type: 'string',
        description: 'Area path',
      })
      .option('iteration-path', {
        type: 'string',
        description: 'Iteration path',
      })
      .option('base-url', {
        type: 'string',
        description: 'Filter alerts by base URL',
      })
      .option('alert-id', {
        type: 'number',
        description: 'Create work item from specific alert ID',
      })
      .option('threshold', {
        type: 'string',
        default: 'Medium',
        description: 'Minimum risk level to create work items (High, Medium, Low)',
      });
  },
  handler: async (argv) => {
    const zap = new ZapClient({
      host: argv.host as string,
      port: argv.port as number,
      apiKey: argv.apiKey as string | undefined,
    });

    const azure = new AzureDevOpsService({
      organization: argv.organization as string,
      project: argv.project as string,
      pat: argv.pat as string,
    });

    console.log('Creating Azure DevOps work item(s)...');

    try {
      const riskLevels = ['Informational', 'Low', 'Medium', 'High'];
      const thresholdIndex = riskLevels.indexOf((argv.threshold as string) || 'Medium');

      if (argv['alert-id']) {
        const alertsResponse = await zap.alerts.getAlerts(argv['base-url'] as string | undefined);
        const alert = alertsResponse.alerts.find((a: any) => a.id === (argv['alert-id'] as number));

        if (!alert) {
          console.error(`Alert with ID ${argv['alert-id']} not found`);
          process.exit(1);
        }

        const workItem = await azure.createBugFromAlert(
          alert,
          riskLevels.indexOf(alert.risk) >= 3 ? '1' : '2',
          riskLevels.indexOf(alert.risk) >= 3 ? 1 : 2
        );

        console.log(`Work item created successfully!`);
        console.log(`Work Item ID: ${workItem.id}`);
        console.log(`URL: ${workItem.url}`);
      } else {
        const alertsResponse = await zap.alerts.getAlerts(argv['base-url'] as string | undefined);
        const alerts = alertsResponse.alerts.filter(
          (a) => riskLevels.indexOf(a.risk) >= thresholdIndex
        );

        console.log(`Found ${alerts.length} alerts meeting threshold`);

        let created = 0;
        for (const alert of alerts) {
          try {
            const workItem = await azure.createBugFromAlert(
              alert,
              riskLevels.indexOf(alert.risk) >= 3 ? '1' : '2',
              riskLevels.indexOf(alert.risk) >= 3 ? 1 : 2
            );
            console.log(`Created: #${workItem.id} - ${alert.alert}`);
            created++;
          } catch (err: any) {
            console.error(`Failed to create work item for ${alert.alert}: ${err.message}`);
          }
        }

        console.log(`\nTotal work items created: ${created}`);
      }
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  },
};
