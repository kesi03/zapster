import yargs from 'yargs';
import { ZapClient } from '../zap/ZapClient';
import { AzureDevOpsService } from '../services/AzureDevOpsService';

export const createTestResultCommand: yargs.CommandModule = {
  command: 'createTestResult',
  describe: 'Create a test run in Azure DevOps from ZAP scan results',
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
      .option('test-run-name', {
        alias: 'n',
        type: 'string',
        demandOption: true,
        description: 'Name for the test run',
      })
      .option('base-url', {
        type: 'string',
        description: 'Filter alerts by base URL',
      })
      .option('build-id', {
        type: 'number',
        description: 'Azure DevOps build ID to associate',
      })
      .option('release-id', {
        type: 'number',
        description: 'Azure DevOps release ID to associate',
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

    console.log('Creating Azure DevOps test result...');

    try {
      const alertsResponse = await zap.alerts.getAlerts(argv.baseUrl as string | undefined);
      const alerts = alertsResponse.alerts;

      console.log(`Found ${alerts.length} alerts to convert to test results`);

      const testResults = alerts.map((alert: any) => ({
        name: `${alert.alert} - ${alert.url}`,
        passed: alert.risk === 'Low' || alert.risk === 'Informational',
        errorMessage: alert.risk !== 'Low' && alert.risk !== 'Informational' 
          ? `[${alert.risk}] ${alert.alert}: ${alert.solution || 'No solution provided'}`
          : undefined,
        duration: 0,
      }));

      const testRun = await azure.createTestResult(
        argv['test-run-name'] as string,
        testResults,
        argv['build-id'] as number | undefined,
        argv['release-id'] as number | undefined
      );

      console.log(`Test run created successfully!`);
      console.log(`Test Run ID: ${testRun.id}`);
      console.log(`URL: ${testRun.url}`);
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  },
};
