import yargs from 'yargs';
import * as fs from 'fs';
import * as yaml from 'yaml';
import * as path from 'path';
import { ZapClient } from '../../zap/ZapClient';
import { initLoggerWithWorkspace, getWorkspacePath } from '../../utils/workspace';
import { log } from '../../utils/logger';
import { runAutomationWithProgress } from './automate';

const REPORT_EXTENSIONS = ['.html', '.json', '.xml', '.md', '.pdf'];

function copyReportsWithTimestamp(srcDir: string, destDir: string): string[] {
  const copiedFiles: string[] = [];

  if (!fs.existsSync(srcDir)) {
    log.warn(`Report source directory does not exist: ${srcDir}`);
    return copiedFiles;
  }

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const findAndCopyReports = (currentDir: string): void => {
    const files = fs.readdirSync(currentDir);
    
    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        findAndCopyReports(fullPath);
        continue;
      }

      const ext = path.extname(file).toLowerCase();
      if (!REPORT_EXTENSIONS.includes(ext)) {
        continue;
      }

      let destPath = path.join(destDir, file);

      if (fs.existsSync(destPath)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const nameWithoutExt = path.basename(file, ext);
        destPath = path.join(destDir, `${nameWithoutExt}_${timestamp}${ext}`);
      }

      fs.copyFileSync(fullPath, destPath);
      copiedFiles.push(destPath);
      log.info(`Copied report: ${path.basename(destPath)}`);
    }
  };

  findAndCopyReports(srcDir);
  return copiedFiles;
}

export const daemonAutomateCommand: yargs.CommandModule = {
  command: 'daemon',
  describe: 'Run ZAP automation against a local ZAP daemon',
  builder: (yargs) => {
    return yargs
      .option('file', {
        alias: 'f',
        type: 'string',
        description: 'Path to the ZAP automation plan YAML file',
        demandOption: true,
      })
      .option('workspace', {
        alias: 'w',
        type: 'string',
        description: 'Workspace directory (fallback if ZAP home cannot be determined)',
      });
  },
  handler: async (argv) => {
    initLoggerWithWorkspace();
    const planFile = argv.file as string;

    if (!planFile) {
      log.error('Plan file is required. Use --file or --f');
      process.exit(1);
    }

    if (!fs.existsSync(planFile)) {
      log.error(`Plan file not found: ${planFile}`);
      process.exit(1);
    }

    const zap = new ZapClient({
      host: argv.host as string,
      port: argv.port as number,
      apiKey: argv.apiKey as string | undefined,
    });

    const workspace = (argv.workspace as string) || process.env.ZAPR_WORKSPACE || '.';

    try {
      const version = await zap.core.getVersion();
      log.success(`Connected to ZAP version: ${version}`);

      let zapHome: string;
      try {
        zapHome = await zap.core.getZapHomePath();
        log.info(`ZAP home directory: ${zapHome}`);
      } catch (error) {
        if (argv.workspace) {
          zapHome = path.join(argv.workspace as string, '.zap');
          log.warn(`Could not determine ZAP home from daemon, using fallback: ${zapHome}`);
        } else {
          log.error('Could not determine ZAP home directory. Use --workspace to specify.');
          process.exit(1);
        }
      }

      if (!zapHome) {
        if (argv.workspace) {
          zapHome = path.join(argv.workspace as string, '.zap');
          log.warn(`ZAP home was undefined, using fallback: ${zapHome}`);
        } else {
          log.error('Could not determine ZAP home directory. Use --workspace to specify.');
          process.exit(1);
        }
      }

      const planContent = fs.readFileSync(planFile, 'utf-8');
      const plan = yaml.parse(planContent);

      log.info(`Running ZAP Automation Plan: ${plan.name || planFile}`);
      log.info(`Plan file: ${planFile}`);

      const expectedJobs = (plan.jobs || []).map((job: any) => job.type);
      log.info(`Jobs: ${expectedJobs.join(' -> ')}`);

      const absolutePlanPath = path.resolve(planFile);
      const planId = await zap.automation.runPlan(absolutePlanPath);
      log.info(`Plan started with ID: ${planId}`);

      const reportPaths = await runAutomationWithProgress(zap, planId, expectedJobs);

      log.success('Automation plan completed successfully!');

      const reportJob = (plan.jobs || []).find((j: any) => j.type === 'report');
      const reportDir = reportJob?.parameters?.reportDir || 'zap-results';
      const planDir = path.dirname(planFile);
      const srcReportDir = path.isAbsolute(reportDir) ? reportDir : path.join(planDir, reportDir);
      const destReportDir = getWorkspacePath('reports');

  log.info(`Looking for reports in: ${srcReportDir}`);
  log.info(`Copying reports to: ${destReportDir}`);

      const copiedFiles = copyReportsWithTimestamp(srcReportDir, destReportDir);

      if (copiedFiles.length > 0) {
        const uniqueFiles = [...new Set(copiedFiles.map((f: string) => path.basename(f)))];
        log.success(`Copied ${uniqueFiles.length} report(s): ${uniqueFiles.join(', ')}`);
      } else {
        log.warn('No reports found in ZAP output directory');
      }

    } catch (error: any) {
      log.error(`Error: ${error.message}`);
      process.exit(1);
    }
  },
};
