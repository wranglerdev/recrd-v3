import type { JSX } from "react";
import type { RecentExecutionDto } from "../../shared/ipc-contract.js";
import { Button, Panel, StatusMessage } from "../components/ui/index.js";
import { useBridge, useIpcQuery } from "../state/index.js";
import {
  EXECUTION_RESULT_ICON,
  formatExecutionDuration,
  formatExecutionWhen,
} from "./execution-format.js";

// Per-case execution history (PRD §8). Lists a single case's past runs
// newest-first, read from the database via `execution:listByCase`. The
// `reloadKey` lets the caller (the Automation screen) refresh the list when a
// run finishes. The bridge is absent outside Electron, so the query stays idle
// and the list renders its empty state.

export type CaseExecutionHistoryProps = {
  readonly caseId: string;
  /** Bumped by the caller to re-fetch (e.g. after a run finishes). */
  readonly reloadKey?: number;
  /** When provided, each row gets an "Exportar log" action for its execution. */
  readonly onExportLog?: (executionId: string) => void;
};

export function CaseExecutionHistory(props: CaseExecutionHistoryProps): JSX.Element {
  const bridge = useBridge();
  const { data } = useIpcQuery<readonly RecentExecutionDto[]>(
    bridge === null ? null : () => bridge.listExecutionsByCase({ caseId: props.caseId }),
    [bridge, props.caseId, props.reloadKey],
  );
  const executions = data ?? [];

  return (
    <Panel title="Histórico de execuções">
      {executions.length === 0 ? (
        <StatusMessage>Nenhuma execução para este caso.</StatusMessage>
      ) : (
        <ul className="execution-history" data-testid="execution-history">
          {executions.map((execution) => (
            <li
              className="execution-history__row"
              key={execution.id}
              data-testid="execution-row"
              data-result={execution.result}
            >
              <span className="execution-history__icon" aria-hidden>
                {EXECUTION_RESULT_ICON[execution.result]}
              </span>
              <span className="execution-history__when">
                {formatExecutionWhen(execution.startedAt)} (
                {formatExecutionDuration(execution.durationMs)})
              </span>
              {props.onExportLog !== undefined && (
                <Button
                  variant="ghost"
                  size="sm"
                  data-testid="execution-export-log"
                  onClick={() => props.onExportLog?.(execution.id)}
                >
                  Exportar log
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
