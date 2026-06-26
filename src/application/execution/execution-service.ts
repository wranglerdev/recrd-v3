import { createAuditFields, type AuditFields } from "../../domain/audit/audit-fields.js";
import { resultFromExitCode, type ExecutionResult } from "../../domain/execution/execution.js";
import type { UserContext } from "../../domain/auth/user-context.js";

// Test executions (PRD §8, §15, §16). The read side lists recent executions for
// the Home screen; the write side records an execution when a run finishes —
// mapping the runner's exit code to a result, stamping audit fields, and handing
// the log to a sink (written to logs/executions on disk). Pure orchestration over
// injected ports, free of Node/Electron and unit-testable.

/** A persisted execution row (mirrors the executions table). */
export interface StoredExecution extends AuditFields {
  readonly id: string;
  readonly caseId: string;
  readonly startedAt: string;
  readonly result: ExecutionResult;
  readonly durationMs: number;
  readonly log: string;
}

/** Persistence port for executions, implemented by the infrastructure adapter. */
export interface ExecutionRepository {
  list(): StoredExecution[];
  create(execution: StoredExecution): StoredExecution;
}

/** Persists the raw run log (e.g. to logs/executions/<id>.log). */
export type ExecutionLogSink = (executionId: string, log: string) => void;

/** What a finished run hands to {@link ExecutionUseCases.record}. */
export interface RecordExecutionInput {
  readonly caseId: string;
  readonly startedAt: Date;
  readonly finishedAt: Date;
  /** Robot process exit code (0 = passed, 1..250 = failed, else error). */
  readonly exitCode: number;
  readonly log: string;
}

/** Resolves a case's display name; undefined when the case no longer exists. */
export type CaseNameLookup = (caseId: string) => string | undefined;

/** An execution summarised for the Home screen, with its case name resolved. */
export interface RecentExecution {
  readonly id: string;
  readonly caseId: string;
  readonly caseName: string;
  readonly result: ExecutionResult;
  readonly startedAt: string;
  readonly durationMs: number;
}

export interface ExecutionUseCaseDeps {
  readonly repository: ExecutionRepository;
  readonly caseName: CaseNameLookup;
  readonly userContext: UserContext;
  readonly newId: () => string;
  readonly saveLog: ExecutionLogSink;
}

export interface ExecutionUseCases {
  /** Returns executions newest-first, capped to `limit` (default 10). */
  listRecent(limit?: number): RecentExecution[];
  /** Records a finished run: persists the row (audited) and saves its log. */
  record(input: RecordExecutionInput): StoredExecution;
}

export function createExecutionUseCases(deps: ExecutionUseCaseDeps): ExecutionUseCases {
  const { repository, caseName, userContext, newId, saveLog } = deps;
  return {
    record(input) {
      const id = newId();
      const durationMs = Math.max(0, input.finishedAt.getTime() - input.startedAt.getTime());
      const stored = repository.create({
        id,
        caseId: input.caseId,
        startedAt: input.startedAt.toISOString(),
        result: resultFromExitCode(input.exitCode),
        durationMs,
        log: input.log,
        ...createAuditFields(userContext.username, input.finishedAt),
      });
      saveLog(id, input.log);
      return stored;
    },
    listRecent(limit = 10) {
      return repository
        .list()
        .slice()
        .sort((a, b) => (a.startedAt < b.startedAt ? 1 : a.startedAt > b.startedAt ? -1 : 0))
        .slice(0, limit)
        .map((execution) => ({
          id: execution.id,
          caseId: execution.caseId,
          caseName: caseName(execution.caseId) ?? "Caso removido",
          result: execution.result,
          startedAt: execution.startedAt,
          durationMs: execution.durationMs,
        }));
    },
  };
}
