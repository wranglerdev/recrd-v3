import type { JSX } from "react";
import type { CompileResponse } from "../../shared/ipc-contract.js";
import { StatusMessage } from "../components/ui/index.js";

// Presentational view of a compilation result (PRD §13, §14): the generated
// `.robot` preview on success, or the validation/robot errors on failure, plus
// any selector-stability warnings. Prop-driven so it is testable without IPC.

export type CompileResultViewProps = {
  /** A status line (e.g. "Compilando…") shown above the result, when set. */
  readonly status?: string | null;
  /** The latest compile result, or null before the first compile. */
  readonly result?: CompileResponse | null;
};

export function CompileResultView(props: CompileResultViewProps): JSX.Element {
  const { status, result } = props;
  return (
    <section className="rc-panel" aria-label="Compilação" data-testid="compile-result">
      <header className="rc-panel__header">
        <h2 className="rc-panel__title">Compilação</h2>
      </header>
      <div className="rc-panel__body compile">
        {status != null && <StatusMessage data-testid="compile-status">{status}</StatusMessage>}
        {result != null && result.ok && (
          <>
            {result.warnings.length > 0 && (
              <ul
                className="compile__warnings"
                aria-label="Avisos de seletor"
                data-testid="compile-warnings"
              >
                {result.warnings.map((warning) => (
                  <li key={warning.index}>{warning.message}</li>
                ))}
              </ul>
            )}
            {/* prettier-ignore */}
            <pre className="rc-log" aria-label="Preview do .robot" data-testid="compile-robot-preview">{result.robot}</pre>
          </>
        )}
        {result != null && !result.ok && (
          <ul
            className="compile__errors"
            aria-label="Erros de compilação"
            role="alert"
            data-testid="compile-errors"
          >
            {result.scriptErrors.map((issue, index) => (
              <li key={`s${index}`}>{issue.message}</li>
            ))}
            {result.robotErrors.map((message, index) => (
              <li key={`r${index}`}>{message}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
