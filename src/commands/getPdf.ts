import yargs from 'yargs';
import * as fs from 'fs';
import { ZapClient } from '../zap/ZapClient';
import { initLoggerWithWorkspace, getWorkspacePath } from '../utils/workspace';
import { log } from '../utils/logger';
import { generatePdfFromHtml, closeBrowser } from '../utils/pdf';

export const getPdfCommand: yargs.CommandModule = {
  command: 'getPdf',
  describe: 'Generate a PDF report from ZAP scan results',
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
        default: 'report.pdf',
        description: 'Output PDF filename',
      })
      .option('title', {
        alias: 't',
        type: 'string',
        default: 'ZAP Security Scan Report',
        description: 'Report title',
      });
  },
  handler: async (argv) => {
    initLoggerWithWorkspace();
    const zap = new ZapClient({
      host: argv.host as string,
      port: argv.port as number,
      apiKey: argv.apiKey as string | undefined,
    });

    const filename = (argv.name as string) || 'report.pdf';

    try {
      log.info('Generating HTML report for PDF conversion...');

      const htmlReport = await zap.reports.getHtmlReport();
      log.info('Converting HTML to PDF...');

      const pdfPath = getWorkspacePath(filename);
      await generatePdfFromHtml(htmlReport, pdfPath);

      log.success(`PDF report saved to: ${pdfPath}`);
    } catch (error: any) {
      log.error(`Error: ${error.message}`);
      process.exit(1);
    } finally {
      await closeBrowser();
    }
  },
};
