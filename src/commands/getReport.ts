import yargs from 'yargs';
import * as fs from 'fs';
import * as path from 'path';
import { ZapClient } from '../zap/ZapClient';

export const getReportCommand: yargs.CommandModule = {
  command: 'getReport',
  describe: 'Generate a security report in various formats',
  builder: (yargs) => {
    return yargs
      .option('format', {
        alias: 'f',
        type: 'string',
        choices: ['xml', 'json', 'md', 'html'],
        demandOption: true,
        description: 'Report format',
      })
      .option('output', {
        alias: 'o',
        type: 'string',
        description: 'Output file path (default: stdout)',
      })
      .option('title', {
        type: 'string',
        description: 'Report title',
      })
      .option('template', {
        type: 'string',
        description: 'Report template name',
      })
      .option('description', {
        type: 'string',
        description: 'Report description',
      });
  },
  handler: async (argv) => {
    const zap = new ZapClient({
      host: argv.host as string,
      port: argv.port as number,
      apiKey: argv.apiKey as string | undefined,
    });

    console.log(`Generating ${(argv.format as string).toUpperCase()} report...`);

    try {
      let report: string;
      const format = argv.format as 'xml' | 'json' | 'md' | 'html';

      switch (format) {
        case 'xml':
          report = await zap.reports.getXmlReport();
          break;
        case 'json':
          const jsonReport = await zap.reports.getJsonReport();
          report = JSON.stringify(jsonReport, null, 2);
          break;
        case 'md':
          report = await zap.reports.getMdReport();
          break;
        case 'html':
          report = await zap.reports.getHtmlReport();
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      if (argv.output) {
        const outputPath = path.resolve(argv.output as string);
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, report, 'utf-8');
        console.log(`Report saved to: ${outputPath}`);
      } else {
        console.log(report);
      }
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  },
};
