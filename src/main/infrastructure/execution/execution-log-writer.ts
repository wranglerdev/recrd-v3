import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ExecutionLogSink } from "../../../application/execution/execution-service.js";

// Persists a run's full log to logs/executions/<id>.log (PRD §15). The directory
// is created at bootstrap (ensureAppDirectories). Integration code — exercised via
// the E2E suite, not unit tests.
export function createExecutionLogWriter(executionsDir: string): ExecutionLogSink {
  return (executionId, log) => {
    writeFileSync(join(executionsDir, `${executionId}.log`), log, "utf8");
  };
}
