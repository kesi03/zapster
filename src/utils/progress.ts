import cliProgress from 'cli-progress';

export function isCI(): boolean {
  return process.env.CI === 'true' || 
         process.env.GITHUB_ACTIONS === 'true' ||
         process.env.GITLAB_CI !== undefined ||
         process.env.CIRCLECI !== undefined ||
         process.env.TRAVIS !== undefined;
}

export function createProgressBar(format: string, total?: number): cliProgress.SingleBar | null {
  if (isCI()) {
    return null;
  }
  
  return new cliProgress.SingleBar({
    format,
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
  });
}

export function updateProgress(
  progressBar: cliProgress.SingleBar | null,
  value: number,
  payload?: Record<string, any>
): void {
  if (progressBar) {
    progressBar.update(value, payload);
  }
}

export function startProgress(
  progressBar: cliProgress.SingleBar | null,
  total: number,
  startPayload?: Record<string, any>
): void {
  if (progressBar) {
    progressBar.start(total, 0, startPayload);
  }
}

export function stopProgress(progressBar: cliProgress.SingleBar | null): void {
  if (progressBar) {
    progressBar.stop();
  }
}
