import chalk from "chalk";
import fs from "node:fs";
import path from "node:path";
import pm2 from "pm2";
import { Arguments } from "yargs";
import { PM2BusPacket } from "./types";

function tailLines(text: string, n: number): string {
  if (!n || n <= 0) return text;
  const lines = text.split(/\r?\n/);
  return lines.slice(-n).join("\n");
}

export const logsDaemonCommand = {
  command: "log",
  describe: "Return PM2 logs for the ZAP daemon",

  builder: (yargs: any) => {
    return yargs
      .option("name", {
        alias: "N",
        description: "PM2 process name",
        type: "string",
        default: "zap-daemon",
      })
      .option("lines", {
        alias: "n",
        description: "Number of log lines to return",
        type: "number",
        default: 200,
      })
      .option("json", {
        description: "Return logs as JSON",
        type: "boolean",
        default: false,
      })
      .option("follow", {
        alias: "f",
        description: "Stream logs (like tail -f)",
        type: "boolean",
        default: false,
      })
      .option("err", {
        alias: "e",
        description: "Show error log (stderr) instead of output log (stdout)",
        type: "boolean",
        default: false,
      })
      .option("both", {
        alias: "b",
        description: "Show both output and error logs",
        type: "boolean",
        default: false,
      })
      .option("copy", {
        alias: "c",
        description: "Copy logs to a file path instead of printing to console",
        type: "string",
      });
  },

  handler: async (argv: Arguments & {
    name?: string;
    lines?: number;
    json?: boolean;
    follow?: boolean;
    err?: boolean;
    both?: boolean;
    copy?: string;
  }) => {
    const processName = argv.name || "zap-daemon";
    const maxLines = argv.lines ?? 200;
    const asJson = argv.json ?? false;
    const follow = argv.follow ?? false;
    const showErr = argv.err ?? false;
    const showBoth = argv.both ?? false;
    const copyPath = argv.copy;

    console.log(chalk.blue(`Fetching logs for PM2 process: ${processName}`));

    try {
      await new Promise<void>((resolve, reject) => {
        pm2.connect((err) => (err ? reject(err) : resolve()));
      });

      const processList = await new Promise<any[]>((resolve, reject) => {
        pm2.list((err, list) => (err ? reject(err) : resolve(list)));
      });

      const proc = processList.find((p) => p.name === processName);

      if (!proc) {
        console.error(chalk.red(`PM2 process not found: ${processName}`));
        pm2.disconnect();
        process.exit(1);
      }

      const outLog = proc.pm2_env?.pm_out_log_path;
      const errLog = proc.pm2_env?.pm_err_log_path;

      if (follow) {
        console.log(chalk.green(`Streaming logs (Ctrl+C to stop)...`));

        pm2.launchBus((err, bus) => {
          if (err) {
            console.error(chalk.red(`Failed to launch PM2 bus: ${err.message}`));
            process.exit(1);
          }

          bus.on("log:out", (packet: PM2BusPacket) => {
            if (packet.process.name === processName) {
              process.stdout.write(chalk.green(`[OUT] `) + packet.data);
            }
          });

          bus.on("log:err", (packet: PM2BusPacket) => {
            if (packet.process.name === processName) {
              process.stdout.write(chalk.red(`[ERR] `) + packet.data);
            }
          });
        });

        return; // keep process alive
      }

      const outContent =
        outLog && fs.existsSync(outLog)
          ? tailLines(fs.readFileSync(outLog, "utf-8"), maxLines)
          : "";

      const errContent =
        errLog && fs.existsSync(errLog)
          ? tailLines(fs.readFileSync(errLog, "utf-8"), maxLines)
          : "";

      if (copyPath) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const baseName = `${processName}-${timestamp}`;

        if (showErr) {
          const filePath = path.join(copyPath, `${baseName}.err.log`);
          fs.writeFileSync(filePath, errContent || "");
          console.log(chalk.green(`Error logs copied to: ${filePath}`));
        } else if (showBoth) {
          const outPath = path.join(copyPath, `${baseName}.out.log`);
          const errPath = path.join(copyPath, `${baseName}.err.log`);
          fs.writeFileSync(outPath, outContent || "");
          fs.writeFileSync(errPath, errContent || "");
          console.log(chalk.green(`Logs copied to: ${outPath}, ${errPath}`));
        } else {
          const filePath = path.join(copyPath, `${baseName}.out.log`);
          fs.writeFileSync(filePath, outContent || "");
          console.log(chalk.green(`Logs copied to: ${filePath}`));
        }
      } else if (asJson) {
        console.log(
          JSON.stringify(
            {
              process: processName,
              stdout: outContent.split(/\r?\n/),
              stderr: errContent.split(/\r?\n/),
            },
            null,
            2
          )
        );
      } else if (showErr) {
        console.log(errContent || chalk.gray("(no errors)"));
      } else if (showBoth) {
        const combined = [
          chalk.green("=== STDOUT ==="),
          outContent || chalk.gray("(no stdout)"),
          "",
          chalk.red("=== STDERR ==="),
          errContent || chalk.gray("(no stderr)"),
        ].join("\n");
        console.log(combined);
      } else {
        console.log(outContent || chalk.gray("(no output)"));
      }
    } catch (err: any) {
      console.error(chalk.red(`Failed to read logs: ${err.message}`));
      process.exit(1);
    } finally {
      pm2.disconnect();
    }
  },
};
