import type { JSX } from "react";
import type { ExecutionResultDto } from "../../shared/ipc-contract.js";
import { EXECUTION_RESULT_ICON as RESULT_ICON } from "./execution-format.js";

// Home screen (PRD §8): recent executions + quick actions, designed to reach an
// automation in up to 3 clicks. Presentational — data and handlers are injected,
// so it is testable without IPC.

export type ExecutionSummary = {
  readonly id: string;
  readonly name: string;
  readonly result: ExecutionResultDto;
  readonly when: string;
  readonly duration: string;
};

export type HomeScreenProps = {
  readonly recentExecutions: readonly ExecutionSummary[];
  onNewProject: () => void;
  onRecordTest: () => void;
  onImportMass: () => void;
  onOpenLastProject: () => void;
};

export function HomeScreen(props: HomeScreenProps): JSX.Element {
  return (
    <main>
      <section aria-label="Últimas execuções">
        <h2>Últimas execuções</h2>
        {props.recentExecutions.length === 0 ? (
          <p>Nenhuma execução ainda.</p>
        ) : (
          <ul>
            {props.recentExecutions.map((execution) => (
              <li key={execution.id}>
                <span aria-hidden>{RESULT_ICON[execution.result]}</span> {execution.name} —{" "}
                {execution.when} ({execution.duration})
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Ações rápidas">
        <h2>Ações rápidas</h2>
        <button type="button" onClick={props.onNewProject}>
          Novo Projeto
        </button>
        <button type="button" onClick={props.onRecordTest}>
          Gravar Novo Teste
        </button>
        <button type="button" onClick={props.onImportMass}>
          Importar Massa
        </button>
        <button type="button" onClick={props.onOpenLastProject}>
          Abrir Último Projeto
        </button>
      </section>
    </main>
  );
}
