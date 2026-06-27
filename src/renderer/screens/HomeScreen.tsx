import type { JSX } from "react";
import type { ExecutionResultDto } from "../../shared/ipc-contract.js";
import { Button, EmptyState, Page, Panel } from "../components/ui/index.js";
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
    <Page title="Início" description="Comece uma automação em poucos cliques.">
      <Panel title="Ações rápidas">
        <div className="home__actions">
          <Button onClick={props.onNewProject}>Novo Projeto</Button>
          <Button variant="secondary" onClick={props.onRecordTest}>
            Gravar Novo Teste
          </Button>
          <Button variant="secondary" onClick={props.onImportMass}>
            Importar Massa
          </Button>
          <Button variant="secondary" onClick={props.onOpenLastProject}>
            Abrir Último Projeto
          </Button>
        </div>
      </Panel>

      <Panel title="Últimas execuções">
        {props.recentExecutions.length === 0 ? (
          <EmptyState
            title="Nenhuma execução ainda."
            description="Grave e execute um teste para ver o histórico aqui."
          />
        ) : (
          <ul className="home__recent" aria-label="Últimas execuções">
            {props.recentExecutions.map((execution) => (
              <li className="home__recent-item" key={execution.id}>
                <span aria-hidden>{RESULT_ICON[execution.result]}</span> {execution.name} —{" "}
                {execution.when} ({execution.duration})
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </Page>
  );
}
