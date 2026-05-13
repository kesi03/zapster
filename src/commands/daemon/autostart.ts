import chalk from "chalk";
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as yaml from 'yaml';
import { Arguments } from "yargs";
import { httpGet } from "./httpHelper";
import { ZapClient } from "../../zap/ZapClient";
import { startDaemon, StartDaemonOptions } from "./start";
import { runAutomationWithProgress } from "../zap/automate";

async function waitForDaemon(host: string, port: string | number, timeout = 120): Promise<void> {
  const url = `http://${host}:${port}/JSON/core/view/version/`;

  console.log(chalk.blue(`Waiting for ZAP daemon to be ready at ${url}...`));

  let started = false;

  await new Promise<void>((resolve, reject) => {
    const checkInterval = setInterval(async () => {
      try {
        const resp = await httpGet(url);

        if (resp.status === 200) {
          console.log(chalk.green("✓ ZAP daemon is ready"));
          started = true;
          clearInterval(checkInterval);
          resolve();
        }
      } catch {
        // Not ready yet
      }
    }, 1000);

    setTimeout(() => {
      if (!started) {
        clearInterval(checkInterval);
        reject(new Error("ZAP daemon failed to become ready within timeout"));
      }
    }, timeout * 1000);
  });
}

export const autostartDaemonCommand = {
  command: 'autostart',
  describe: 'Start ZAP daemon and run an automation plan once ready',
  builder: (yargs: any) => {
    return yargs
      .option('plan', {
        description: 'Path to ZAP automation plan YAML file',
        type: 'string',
      })
      .option('toml', {
        alias: 't',
        description: 'Path to zap.toml configuration file',
        type: 'string',
      })
      .option('dir', {
        alias: 'd',
        description: 'ZAP installation directory (where zap.jar is)',
        type: 'string',
      })
      .option('workspace', {
        alias: 'w',
        description: 'ZAP working directory',
        type: 'string',
      })
      .option('name', {
        alias: 'N',
        description: 'PM2 process name',
        type: 'string',
        default: 'zap-daemon',
      });
  },

  handler: async (argv: Arguments & StartDaemonOptions & { plan?: string }) => {
    try {
      const result = await startDaemon(argv);

      let planPath: string | undefined = argv.plan;

      if (!planPath && result.config?.AUTOMATION?.planPath) {
        const tomlDir = result.tomlPath
          ? path.dirname(path.resolve(result.tomlPath))
          : '.';
        planPath = path.resolve(tomlDir, result.config.AUTOMATION.planPath);
      }

      if (!planPath) {
        console.log(chalk.yellow('No plan specified. Daemon started but no automation plan to run.'));
        console.log(chalk.gray('Use --plan <path> or add [AUTOMATION] planPath to your TOML config.'));
        return;
      }

      if (!fs.existsSync(planPath)) {
        console.error(chalk.red(`Plan file not found: ${planPath}`));
        process.exit(1);
      }

      console.log(chalk.blue(`\nAutomation plan: ${planPath}`));

      await waitForDaemon(result.host, result.port);

      const planContent = fs.readFileSync(planPath, 'utf-8');
      const plan = yaml.parse(planContent);
      const expectedJobs = (plan.jobs || []).map((job: any) => job.type);

      console.log(chalk.blue(`Running automation plan with jobs: ${expectedJobs.join(' -> ')}`));

      const zap = new ZapClient({
        host: result.host,
        port: result.port,
        apiKey: result.apiKey || undefined,
      });

      const version = await zap.core.getVersion();
      console.log(chalk.green(`Connected to ZAP version: ${version}`));

      const absolutePlanPath = path.resolve(planPath);
      const planId = await zap.automation.runPlan(absolutePlanPath);
      console.log(chalk.blue(`Plan started with ID: ${planId}`));

      await runAutomationWithProgress(zap, planId, expectedJobs);

      console.log(chalk.green('\n✓ Automation plan completed successfully!'));

    } catch (err: any) {
      console.error(chalk.red(`autostart failed: ${err.message}`));
      process.exit(1);
    }
  },
};
