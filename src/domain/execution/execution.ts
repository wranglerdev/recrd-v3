// Execution record and log handling (PRD §15, §16). Pure: the runner supplies
// timings and exit code; this turns them into an auditable Execution.

export type ExecutionResult = "passed" | "failed" | "error";

export type Execution = {
  readonly id: string;
  readonly caseId: string;
  readonly user: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly result: ExecutionResult;
  readonly log: string;
};

/**
 * Maps a Robot Framework process exit code to a result. Robot uses 0 = all
 * passed, 1..250 = that many failed tests, 251..255 = error.
 */
export function resultFromExitCode(exitCode: number): ExecutionResult {
  if (exitCode === 0) {
    return "passed";
  }
  if (exitCode >= 1 && exitCode <= 250) {
    return "failed";
  }
  return "error";
}

export function buildExecution(params: {
  id: string;
  caseId: string;
  user: string;
  startedAt: Date;
  finishedAt: Date;
  exitCode: number;
  log: string;
}): Execution {
  return {
    id: params.id,
    caseId: params.caseId,
    user: params.user,
    startedAt: params.startedAt.toISOString(),
    finishedAt: params.finishedAt.toISOString(),
    durationMs: Math.max(0, params.finishedAt.getTime() - params.startedAt.getTime()),
    result: resultFromExitCode(params.exitCode),
    log: params.log,
  };
}

/** Formats a timestamped log line, e.g. "10:35:01 Click login button" (PRD §15). */
export function formatLogLine(at: Date, message: string): string {
  return `${at.toISOString().slice(11, 19)} ${message}`;
}
