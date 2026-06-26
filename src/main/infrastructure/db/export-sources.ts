import type {
  ExecutionLogSource,
  ManualScriptSource,
} from "../../../application/export/export-service.js";
import type { ManualScript } from "../../../domain/scripts/script-action.js";
import type { Repositories } from "./repositories.js";

// Infrastructure adapters for the export use cases (PRD §17). They resolve the
// real artifacts from the SQLite repositories: the manual script captured for a
// case (stored as JSON in the scripts table, `kind = "manual"`) and a recorded
// execution's log. Parsing the stored JSON and mapping the ISO timestamp back to
// a Date happens here, keeping the application layer in domain types.

type ScriptRow = { caseId: string; kind: string; content: string; updatedAt: string };
type ExecutionRow = { log: string; startedAt: string };

/**
 * Resolves the most recently updated manual script for a case, parsing its
 * stored JSON into a {@link ManualScript}; undefined when the case has none.
 */
export function createManualScriptSource(repositories: Repositories): ManualScriptSource {
  return (caseId) => {
    const manual = (repositories.scripts.list() as ScriptRow[])
      .filter((row) => row.caseId === caseId && row.kind === "manual")
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0))[0];
    return manual === undefined ? undefined : (JSON.parse(manual.content) as ManualScript);
  };
}

/** Resolves a recorded execution's log and start time; undefined when absent. */
export function createExecutionLogSource(repositories: Repositories): ExecutionLogSource {
  return (executionId) => {
    const row = repositories.executions.findById(executionId) as ExecutionRow | undefined;
    return row === undefined ? undefined : { log: row.log, startedAt: new Date(row.startedAt) };
  };
}
