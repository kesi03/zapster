import yargs from 'yargs';
import { ZapClient } from '../../zap/ZapClient';
import { log } from '../../utils/logger';
import { createProgressBar, updateProgress, stopProgress } from '../../utils/progress';

export async function runAutomationWithProgress(
  zap: ZapClient,
  planId: string,
  expectedJobs: string[]
): Promise<string[]> {
  const reportPaths: string[] = [];
  const jobProgress: Record<string, { progress: number; bar?: any; finished: boolean }> = {};

  for (const job of expectedJobs) {
    jobProgress[job] = { progress: 0, finished: false };
  }

  const overallBar = createProgressBar('Overall |{bar}| {percentage}% | {jobs}');
  updateProgress(overallBar, 0, { jobs: 'Starting...' });

  let lastProcessedIndex = -1;
  let currentJobType = '';
  let done = false;

  while (!done) {
    const progress = await zap.automation.planProgress(planId);

    if (progress.error?.length) {
      log.error(`Plan errors: ${progress.error.join(', ')}`);
    }

    if (progress.info) {
      for (let i = lastProcessedIndex + 1; i < progress.info.length; i++) {
        const msg = progress.info[i];

        const startedMatch = msg.match(/^Job (\S+) started$/);
        if (startedMatch) {
          currentJobType = startedMatch[1];
          log.info(`[${currentJobType}] Started`);

          if (jobProgress[currentJobType] && !jobProgress[currentJobType].bar) {
            jobProgress[currentJobType].bar = createProgressBar(`${currentJobType} |{bar}| {percentage}%`);
            jobProgress[currentJobType].progress = 0;
            updateProgress(jobProgress[currentJobType].bar, 0, {});
          }
        }

        const finishedMatch = msg.match(/^Job (\S+) finished, time taken: (.+)$/);
        if (finishedMatch) {
          const finishedJob = finishedMatch[1];
          const timeTaken = finishedMatch[2];
          jobProgress[finishedJob].finished = true;

          if (jobProgress[finishedJob].bar) {
            stopProgress(jobProgress[finishedJob].bar);
          }

          log.success(`[${finishedJob}] Finished (${timeTaken})`);
          currentJobType = '';
        }

        const reportMatch = msg.match(/generated report (.+)$/);
        if (reportMatch) {
          const reportPath = reportMatch[1];
          reportPaths.push(reportPath);
          log.info(`[report] Generated: ${reportPath}`);
        }

        lastProcessedIndex = i;
      }
    }

    if (currentJobType === 'spider') {
      try {
        const stats = await zap.core.getAllStats();
        const urlsFound = stats['stats.spider.url.found'] || 0;
        const urlsProcessed = stats['stats.spider.urls.processed'] || 0;
        const progressPct = urlsFound > 0 ? Math.min(99, Math.round((urlsProcessed / urlsFound) * 100)) : 0;

        if (progressPct > 0 && progressPct !== jobProgress[currentJobType]?.progress) {
          log.info(`[spider] ${progressPct}% (${urlsProcessed}/${urlsFound} URLs)`);
          jobProgress[currentJobType].progress = progressPct;
        }
        if (jobProgress[currentJobType]?.bar) {
          updateProgress(jobProgress[currentJobType].bar, progressPct, { urls: urlsProcessed });
        }
      } catch {
        // Stats may not be available yet
      }
    } else if (currentJobType === 'spiderAjax') {
      try {
        const ajaxStatus = await zap.ajaxSpider.ajaxSpiderStatus();
        const stats = await zap.core.getAllStats();
        const urlsFound = stats['spiderAjax.urls.added'] || ajaxStatus.nodesVisited || 0;
        const isRunning = ajaxStatus.status === 'RUNNING';
        const progressPct = ajaxStatus.status === 'FINISHED' ? 100 : isRunning ? 50 : 0;

        if (isRunning && urlsFound > 0 && urlsFound !== jobProgress[currentJobType]?.progress) {
          log.info(`[spiderAjax] ${urlsFound} URLs found`);
          jobProgress[currentJobType].progress = urlsFound;
        }
        if (jobProgress[currentJobType]?.bar) {
          updateProgress(jobProgress[currentJobType].bar, progressPct, { urls: urlsFound });
        }
      } catch {
        // Ignore
      }
    } else if (currentJobType === 'activeScan') {
      try {
        const stats = await zap.core.getAllStats();
        const urlsScanned = stats['stats.ascan.urls'] || 0;

        const scans = await zap.ascan.activeScanStatus();
        let activeScanProgress = 0;

        if (Array.isArray(scans) && scans.length > 0) {
          activeScanProgress = scans[0].progress;
        }

        if (activeScanProgress > 0 && activeScanProgress !== jobProgress[currentJobType]?.progress) {
          log.info(`[activeScan] ${activeScanProgress}% (${urlsScanned} URLs)`);
          jobProgress[currentJobType].progress = activeScanProgress;
        }

        if (activeScanProgress > 0) {
          updateProgress(jobProgress[currentJobType].bar, activeScanProgress, { scanned: urlsScanned });
        } else if (urlsScanned > 0) {
          updateProgress(jobProgress[currentJobType].bar, 50, { scanned: urlsScanned });
        }
      } catch {
        // Ignore
      }
    } else if (currentJobType === 'passiveScan-config') {
      if (jobProgress[currentJobType]?.bar) {
        updateProgress(jobProgress[currentJobType].bar, 100, {});
      }
    } else if (currentJobType === 'report') {
      if (jobProgress[currentJobType]?.bar) {
        updateProgress(jobProgress[currentJobType].bar, 50, {});
      }
    }

    if (progress.finished) {
      done = true;
      break;
    }

    const completedCount = Object.values(jobProgress).filter(j => j.finished).length;
    const overallPct = Math.round((completedCount / expectedJobs.length) * 100);
    updateProgress(overallBar, overallPct, { jobs: currentJobType || 'Complete' });

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  stopProgress(overallBar);

  for (const job of expectedJobs) {
    if (!jobProgress[job]?.finished) {
      log.warn(`Job not completed: ${job}`);
    }
  }

  return reportPaths;
}

export const automateCommand: yargs.CommandModule = {
  command: 'automate',
  describe: 'Run ZAP automation using a YAML plan file',
  builder: (yargs) => {
    return yargs
      .command(daemonAutomateCommand)
      .command(dockerAutomateSubCommand)
      .demandCommand(1, 'You must provide a sub-command (daemon or docker)');
  },
  handler: () => {
    // Default handler - show help
  },
};

export { daemonAutomateCommand } from './automateDaemon';
export { dockerAutomateSubCommand } from './automateDocker';

import { daemonAutomateCommand } from './automateDaemon';
import { dockerAutomateSubCommand } from './automateDocker';
