import { defineChannelNames, type Invoke } from "./core.js";

// `execution:*` feature contract — the read side of test executions (PRD §8,
// §15). The Home screen lists recent executions across the project. Wire types
// mirror the application RecentExecution (ISO timestamp, plain fields), so the
// boundary is serialisable with no domain↔DTO mapping.

export type ExecutionResultDto = "passed" | "failed" | "error";

export interface RecentExecutionDto {
  readonly id: string;
  readonly caseId: string;
  readonly caseName: string;
  readonly result: ExecutionResultDto;
  readonly startedAt: string;
  readonly durationMs: number;
}

export interface ListRecentExecutionsRequest {
  /** Caps the number of (newest-first) executions returned; default applies when omitted. */
  readonly limit?: number;
}

export interface ListExecutionsByCaseRequest {
  /** The case whose execution history is listed. */
  readonly caseId: string;
  /** Caps the number of (newest-first) executions returned; default applies when omitted. */
  readonly limit?: number;
}

export type ExecutionChannels = {
  "execution:listRecent": {
    request: ListRecentExecutionsRequest;
    response: readonly RecentExecutionDto[];
  };
  "execution:listByCase": {
    request: ListExecutionsByCaseRequest;
    response: readonly RecentExecutionDto[];
  };
};

export const EXECUTION_CHANNELS = defineChannelNames<
  ExecutionChannels,
  ["execution:listRecent", "execution:listByCase"]
>(["execution:listRecent", "execution:listByCase"]);

/** The slice of the renderer API served by the execution feature. */
export interface ExecutionApi {
  listRecentExecutions(
    request: ListRecentExecutionsRequest,
  ): Promise<readonly RecentExecutionDto[]>;
  listExecutionsByCase(
    request: ListExecutionsByCaseRequest,
  ): Promise<readonly RecentExecutionDto[]>;
}

export function createExecutionApi(invoke: Invoke<ExecutionChannels>): ExecutionApi {
  return {
    listRecentExecutions: (request) => invoke("execution:listRecent", request),
    listExecutionsByCase: (request) => invoke("execution:listByCase", request),
  };
}
