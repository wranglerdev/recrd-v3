import type { JSX } from "react";
import type { AuditEventDto, AuditEventTypeDto } from "../../shared/ipc-contract.js";
import {
  EmptyState,
  LoadingState,
  Page,
  StatusMessage,
  Table,
  type TableColumn,
} from "../components/ui/index.js";
import { useBridge, useIpcQuery } from "../state/index.js";
import { formatExecutionWhen } from "./execution-format.js";

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

const COLUMNS: readonly TableColumn<AuditEventDto>[] = [
  { key: "at", header: "Quando", cell: (event) => formatExecutionWhen(event.at) },
  { key: "type", header: "Evento", cell: (event) => TYPE_LABEL[event.type] },
  { key: "user", header: "Usuário", cell: (event) => event.user },
  {
    key: "details",
    header: "Detalhes",
    cell: (event) => <span className="rc-audit__details">{summarise(event.details)}</span>,
  },
];

export function AuditScreen(): JSX.Element {
  const bridge = useBridge();
  const { data, loading, error } = useIpcQuery<readonly AuditEventDto[]>(
    bridge === null ? null : () => bridge.listAuditEvents({}),
    [bridge],
  );

  return (
    <Page title="Trilha de auditoria" description="Histórico de ações registradas no dispositivo.">
      {error !== null && <StatusMessage tone="error">{error}</StatusMessage>}
      {loading && <LoadingState label="Carregando…" />}

      {data !== null && data.length === 0 && (
        <EmptyState
          title="Nenhum evento registrado."
          description="As ações de importação, compilação, exportação e execução aparecem aqui."
        />
      )}

      {data !== null && data.length > 0 && (
        <Table
          label="Eventos de auditoria"
          columns={COLUMNS}
          rows={data}
          rowKey={(event) => event.id}
        />
      )}
    </Page>
  );
}
