import type { AuditFields } from "../../domain/audit/audit-fields.js";
import type { ExecutionResult } from "../../domain/execution/execution.js";

// Read side of test executions (PRD §8, §15). The Home screen lists the most
// recent executions across the project; this use case reads the persisted rows
// and resolves each case's name for display. Pure orchestration over injected
// ports — the SQLite executions repository and a case-name lookup — so it stays
// free of Node/Electron and is unit-testable.

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
}

export interface ExecutionUseCases {
  /** Returns executions newest-first, capped to `limit` (default 10). */
  listRecent(limit?: number): RecentExecution[];
}

export function createExecutionUseCases(deps: ExecutionUseCaseDeps): ExecutionUseCases {
  const { repository, caseName } = deps;
  return {
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
