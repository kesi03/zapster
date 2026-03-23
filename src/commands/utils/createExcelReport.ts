import yargs from 'yargs';
import * as fs from 'fs';
import { ZapClient } from '../../zap/ZapClient';
import { initLoggerWithWorkspace, getWorkspacePath } from '../../utils/workspace';
import { log } from '../../utils/logger';
import { createExcelFromAlerts, createExcelFromJson } from '../../utils/excel';

export const createExcelReportCommand: yargs.CommandModule = {
  command: 'create-excel-report',
  describe: 'Create an Excel report from ZAP alerts',
  builder: (yargs) => {
    return yargs
      .option('workspace', {
        alias: 'w',
        type: 'string',
        description: 'Workspace directory (default: ZAPSTER_WORKSPACE env)',
      })
      .option('name', {
        alias: 'n',
        type: 'string',
        default: 'zap-report.xlsx',
        description: 'Output Excel filename',
      })
      .option('base-url', {
        alias: 'u',
        type: 'string',
        description: 'Filter alerts by base URL',
      })
      .option('input', {
        alias: 'i',
        type: 'string',
        description: 'Input JSON file path (alternative to fetching from ZAP)',
      });
  },
  handler: async (argv) => {
    initLoggerWithWorkspace();
    const filename = (argv.name as string) || 'zap-report.xlsx';

    try {
      let alerts: any[];

      if (argv.input) {
        log.info(`Reading alerts from: ${argv.input}`);
        const jsonContent = fs.readFileSync(argv.input as string, 'utf-8');
        alerts = JSON.parse(jsonContent);
      } else {
        const zap = new ZapClient({
          host: argv.host as string,
          port: argv.port as number,
          apiKey: argv.apiKey as string | undefined,
        });

        log.info('Fetching alerts from ZAP...');
        const response = await zap.alerts.getAlerts(argv.baseUrl as string | undefined);
        alerts = response.alerts;
      }

      log.info(`Found ${alerts.length} alerts`);

      const riskSummary = {
        High: alerts.filter((a) => a.risk === 'High').length,
        Medium: alerts.filter((a) => a.risk === 'Medium').length,
        Low: alerts.filter((a) => a.risk === 'Low').length,
        Informational: alerts.filter((a) => a.risk === 'Informational').length,
      };

      log.info(`Alert Summary: High=${riskSummary.High}, Medium=${riskSummary.Medium}, Low=${riskSummary.Low}, Info=${riskSummary.Informational}`);

      const outputPath = getWorkspacePath(filename);
      createExcelFromAlerts(alerts, outputPath);

      log.success(`Excel report saved to: ${outputPath}`);
    } catch (error: any) {
      log.error(`Error: ${error.message}`);
      process.exit(1);
    }
  },
};
