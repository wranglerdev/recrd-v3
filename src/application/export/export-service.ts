import { recordAuditEvent, type AuditSink } from "../audit/audit-service.js";
import type { UserContext } from "../../domain/auth/user-context.js";
import { generateRobot } from "../../domain/compiler/robot-generator.js";
import {
  executionLogFileName,
  recrdJsonFileName,
  robotFileName,
  serializeManualScript,
} from "../../domain/export/export-format.js";
import type { ManualScript } from "../../domain/scripts/script-action.js";

// Export use cases (PRD §17). Side effects (writing files, joining paths) are
// injected via ExportEnvironment so the orchestration is unit-testable and the
// application layer stays free of Node/Electron.

export interface ExportEnvironment {
  readonly exportsDir: string;
  join(dir: string, file: string): string;
  writeFile(path: string, content: string): Promise<void>;
}

/** Exports the raw manual script as `<name>.recrd.json`; returns the written path. */
export async function exportManualScriptJson(
  script: ManualScript,
  env: ExportEnvironment,
): Promise<string> {
  const path = env.join(env.exportsDir, recrdJsonFileName(script.name));
  await env.writeFile(path, serializeManualScript(script));
  return path;
}

/** Compiles and exports the script as `<name>.robot`; returns the written path. */
export async function exportCompiledRobot(
  script: ManualScript,
  env: ExportEnvironment,
): Promise<string> {
  const path = env.join(env.exportsDir, robotFileName(script.name));
  await env.writeFile(path, generateRobot(script));
  return path;
}

/** Exports an execution log as `execution-YYYY-MM-DD.log`; returns the written path. */
export async function exportExecutionLog(
  log: string,
  date: Date,
  env: ExportEnvironment,
): Promise<string> {
  const path = env.join(env.exportsDir, executionLogFileName(date));
  await env.writeFile(path, log);
  return path;
}

// ── Wired use cases ────────────────────────────────────────────────────────
// The functions above are pure orchestrators over an ExportEnvironment. The use
// cases below resolve the *real* artifacts (the manual script captured for a
// case, a recorded execution's log) through injected ports, run the matching
// export and record an audited `export` event — keeping the application layer
// free of the SQLite/Node specifics that live in infrastructure.

/** Resolves the manual script captured for a case; undefined when none exists. */
export type ManualScriptSource = (caseId: string) => ManualScript | undefined;

/** A recorded execution's log together with the moment it started. */
export interface ExecutionLogRecord {
  readonly log: string;
  readonly startedAt: Date;
}

/** Resolves a recorded execution's log; undefined when the execution is absent. */
export type ExecutionLogSource = (executionId: string) => ExecutionLogRecord | undefined;

export interface ExportUseCaseDeps {
  readonly manualScript: ManualScriptSource;
  readonly executionLog: ExecutionLogSource;
  readonly env: ExportEnvironment;
  readonly userContext: UserContext;
  readonly clock: () => Date;
  /** Optional audit trail; each successful export records an `export` event. */
  readonly audit?: AuditSink;
}

export interface ExportUseCases {
  /** Exports a case's manual script as `<name>.recrd.json`; returns the path. */
  exportJson(caseId: string): Promise<string>;
  /** Compiles and exports a case's script as `<name>.robot`; returns the path. */
  exportRobot(caseId: string): Promise<string>;
  /** Exports a recorded execution's log as `execution-<date>.log`; returns the path. */
  exportLog(executionId: string): Promise<string>;
}

export function createExportUseCases(deps: ExportUseCaseDeps): ExportUseCases {
  const { manualScript, executionLog, env, userContext, clock, audit } = deps;

  function record(kind: string, details: Record<string, unknown>): void {
    if (audit) {
      recordAuditEvent(audit, {
        type: "export",
        user: userContext.username,
        now: clock(),
        details: { kind, ...details },
      });
    }
  }

  return {
    async exportJson(caseId) {
      const script = manualScript(caseId);
      if (script === undefined) {
        throw new Error("Caso sem script para exportar");
      }
      const path = await exportManualScriptJson(script, env);
      record("json", { caseId, path });
      return path;
    },
    async exportRobot(caseId) {
      const script = manualScript(caseId);
      if (script === undefined) {
        throw new Error("Caso sem script para exportar");
      }
      const path = await exportCompiledRobot(script, env);
      record("robot", { caseId, path });
      return path;
    },
    async exportLog(executionId) {
      const execution = executionLog(executionId);
      if (execution === undefined) {
        throw new Error("Execução não encontrada");
      }
      const path = await exportExecutionLog(execution.log, execution.startedAt, env);
      record("log", { executionId, path });
      return path;
    },
  };
}
