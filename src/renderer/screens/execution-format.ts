import type { ExecutionResultDto } from "../../shared/ipc-contract.js";

// Shared presentation helpers for execution summaries (PRD §8, §15), used by the
// Home recent-executions widget and the per-case history. Pure formatting so the
// screens stay declarative.

/** Glyph per execution result, shown beside each row. */
export const EXECUTION_RESULT_ICON: Record<ExecutionResultDto, string> = {
  passed: "✔",
  failed: "✘",
  error: "⚠",
};

/** Formats an ISO timestamp as "YYYY-MM-DD HH:MM". */
export function formatExecutionWhen(iso: string): string {
  return iso.replace("T", " ").slice(0, 16);
}

/** Formats a duration in milliseconds as a compact seconds string, e.g. "1.2s". */
export function formatExecutionDuration(durationMs: number): string {
  return `${(durationMs / 1000).toFixed(1)}s`;
}
