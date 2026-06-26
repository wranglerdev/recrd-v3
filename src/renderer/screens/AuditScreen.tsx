import type { JSX } from "react";
import type { AuditEventDto, AuditEventTypeDto } from "../../shared/ipc-contract.js";
import { useBridge, useIpcQuery } from "../state/index.js";

// Audit trail screen (PRD §16): lists the recorded audit events (mass import,
// test change, compilation, export, execution) newest-first. Read-only — events
// are recorded by the mutating use cases in the main process. The bridge is
// absent outside Electron, so the query stays idle and a placeholder shows.

const TYPE_LABEL: Record<AuditEventTypeDto, string> = {
  "mass.import": "Importação de massa",
  "test.change": "Alteração de teste",
  compile: "Compilação",
  export: "Exportação",
  execution: "Execução",
};

/** Renders an event's details map as a compact `key: value` summary. */
function summarise(details: Readonly<Record<string, unknown>>): string {
  return Object.entries(details)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(", ");
}

export function AuditScreen(): JSX.Element {
  const bridge = useBridge();
  const { data, loading, error } = useIpcQuery<readonly AuditEventDto[]>(
    bridge === null ? null : () => bridge.listAuditEvents({}),
    [bridge],
  );

  return (
    <section aria-label="Auditoria">
      <h2>Trilha de auditoria</h2>

      {error !== null && <p role="alert">{error}</p>}
      {loading && <p>Carregando…</p>}

      {data !== null && data.length === 0 && <p>Nenhum evento registrado.</p>}

      {data !== null && data.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Quando</th>
              <th>Evento</th>
              <th>Usuário</th>
              <th>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {data.map((event) => (
              <tr key={event.id}>
                <td>{event.at}</td>
                <td>{TYPE_LABEL[event.type]}</td>
                <td>{event.user}</td>
                <td>{summarise(event.details)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
