import type { JSX } from "react";
import type { CompileResponse } from "../../shared/ipc-contract.js";

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
    <section aria-label="Compilação" data-testid="compile-result">
      <h2>Compilação</h2>
      {status != null && <p data-testid="compile-status">{status}</p>}
      {result != null && result.ok && (
        <>
          {result.warnings.length > 0 && (
            <ul aria-label="Avisos de seletor" data-testid="compile-warnings">
              {result.warnings.map((warning) => (
                <li key={warning.index}>{warning.message}</li>
              ))}
            </ul>
          )}
          {/* prettier-ignore */}
          <pre aria-label="Preview do .robot" data-testid="compile-robot-preview">{result.robot}</pre>
        </>
      )}
      {result != null && !result.ok && (
        <ul aria-label="Erros de compilação" role="alert" data-testid="compile-errors">
          {result.scriptErrors.map((issue, index) => (
            <li key={`s${index}`}>{issue.message}</li>
          ))}
          {result.robotErrors.map((message, index) => (
            <li key={`r${index}`}>{message}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
