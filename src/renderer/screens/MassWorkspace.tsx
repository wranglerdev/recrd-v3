import { useEffect, useMemo, useState, type JSX } from "react";
import type { MassDto } from "../../shared/ipc-contract.js";
import { useActiveProject, useBridge, useIpcAction, useIpcQuery } from "../state/index.js";
import { MassScreen, type MassView } from "./MassScreen.js";

// Mass workspace container (PRD §7): binds the presentational MassScreen grid to
// real IPC. It lists the active project's masses, imports a CSV via the native
// file picker, renames the selected mass, edits cell values, and shows the import
// history. The bridge is absent outside Electron, so every action degrades to a
// disconnected state rather than throwing.

/** Default mass name from a CSV path: its file name without extension. */
function massNameFromPath(path: string): string {
  const base = path.split(/[\\/]/).pop() ?? path;
  return base.replace(/\.[^.]+$/, "") || base;
}

function toView(mass: MassDto): MassView {
  return { name: mass.name, columns: mass.columns, rows: mass.rows };
}

export function MassWorkspace(): JSX.Element {
  const bridge = useBridge();
  const { activeProject } = useActiveProject();
  const projectId = activeProject?.id ?? null;

  // Local mirror of the persisted masses so mutations reflect immediately
  // without a full refetch; seeded from the list query and kept in sync below.
  const [masses, setMasses] = useState<readonly MassDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const listQuery = useIpcQuery<readonly MassDto[]>(
    bridge === null || projectId === null ? null : () => bridge.listMassesByProject({ projectId }),
    [bridge, projectId],
  );

  useEffect(() => {
    const loaded = listQuery.data;
    if (loaded !== null) {
      setMasses(loaded);
      setSelectedId((current) =>
        current !== null && loaded.some((mass) => mass.id === current)
          ? current
          : (loaded[0]?.id ?? null),
      );
    }
  }, [listQuery.data]);

  const selected = useMemo(
    () => masses.find((mass) => mass.id === selectedId) ?? null,
    [masses, selectedId],
  );

  // Replaces a mass in the local mirror after a mutation returns the fresh row.
  const upsert = (mass: MassDto): void => {
    setMasses((current) => {
      const index = current.findIndex((item) => item.id === mass.id);
      if (index === -1) {
        return [...current, mass];
      }
      const next = current.slice();
      next[index] = mass;
      return next;
    });
  };

  const importAction = useIpcAction(async (): Promise<MassDto | null> => {
    if (bridge === null || projectId === null) {
      throw new Error("Recurso indisponível fora do aplicativo.");
    }
    const selection = await bridge.selectCsvFile();
    if (selection === null) {
      return null;
    }
    const result = await bridge.importMass({
      projectId,
      name: massNameFromPath(selection.path),
      csv: selection.content,
      source: selection.path,
    });
    if (!result.ok) {
      throw new Error(result.errors.join(" "));
    }
    return result.mass;
  });

  const renameAction = useIpcAction(async (name: string): Promise<MassDto> => {
    if (bridge === null || selected === null) {
      throw new Error("Recurso indisponível fora do aplicativo.");
    }
    return bridge.renameMass({ id: selected.id, name });
  });

  const editAction = useIpcAction(
    async (rowIndex: number, column: string, value: string): Promise<MassDto> => {
      if (bridge === null || selected === null) {
        throw new Error("Recurso indisponível fora do aplicativo.");
      }
      return bridge.editMassValue({ id: selected.id, rowIndex, column, value });
    },
  );

  const handleImport = (): void => {
    void importAction.run().then((mass) => {
      if (mass !== null) {
        upsert(mass);
        setSelectedId(mass.id);
      }
    });
  };

  const handleRename = (name: string): void => {
    void renameAction.run(name).then((mass) => {
      if (mass !== null) {
        upsert(mass);
      }
    });
  };

  const handleEditValue = (rowIndex: number, column: string, value: string): void => {
    void editAction.run(rowIndex, column, value).then((mass) => {
      if (mass !== null) {
        upsert(mass);
      }
    });
  };

  if (projectId === null) {
    return (
      <section aria-label="Massas">
        <h2>Massas</h2>
        <p>Selecione um projeto para ver suas massas.</p>
      </section>
    );
  }

  const error = importAction.error ?? renameAction.error ?? editAction.error ?? listQuery.error;

  return (
    <section aria-label="Massas">
      <header>
        <h2>Massas</h2>
        <button
          type="button"
          data-testid="mass-import"
          onClick={handleImport}
          disabled={importAction.loading}
        >
          Importar CSV
        </button>
      </header>

      {error !== null && <p role="alert">{error}</p>}

      {masses.length === 0 ? (
        <p>Nenhuma massa importada ainda.</p>
      ) : (
        <nav aria-label="Massas do projeto">
          <ul data-testid="mass-list">
            {masses.map((mass) => (
              <li key={mass.id}>
                <button
                  type="button"
                  data-testid="mass-select"
                  data-mass-id={mass.id}
                  aria-current={mass.id === selectedId ? "true" : undefined}
                  onClick={() => setSelectedId(mass.id)}
                >
                  {mass.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {selected !== null && (
        <>
          <MassRename
            key={selected.id}
            current={selected.name}
            pending={renameAction.loading}
            onRename={handleRename}
          />
          <MassScreen mass={toView(selected)} onEditValue={handleEditValue} />
          <ImportHistory mass={selected} />
        </>
      )}
    </section>
  );
}

function MassRename(props: {
  readonly current: string;
  readonly pending: boolean;
  onRename: (name: string) => void;
}): JSX.Element {
  const [name, setName] = useState(props.current);
  return (
    <form
      aria-label="Renomear massa"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = name.trim();
        if (trimmed.length > 0 && trimmed !== props.current) {
          props.onRename(trimmed);
        }
      }}
    >
      <label>
        Nome da massa
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <button type="submit" disabled={props.pending}>
        Renomear
      </button>
    </form>
  );
}

function ImportHistory({ mass }: { readonly mass: MassDto }): JSX.Element {
  return (
    <section aria-label="Histórico de importação">
      <h3>Histórico de importação</h3>
      {mass.history.length === 0 ? (
        <p>Sem importações registradas.</p>
      ) : (
        <ul data-testid="mass-history">
          {mass.history.map((entry, index) => (
            <li key={`${entry.at}-${index}`} data-testid="mass-history-row">
              {entry.at} — {entry.rowCount} linha(s) de {entry.source}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
