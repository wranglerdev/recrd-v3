import { useEffect, useState, type JSX } from "react";
import type { AppInfo } from "../shared/ipc-contract.js";
import { HomeScreen, type ExecutionSummary } from "./screens/HomeScreen.js";
import { AutomationScreen } from "./screens/AutomationScreen.js";
import { MassScreen, type MassView } from "./screens/MassScreen.js";
import { NewProjectForm, type NewProjectValues } from "./components/NewProjectForm.js";

// Application shell that wires the presentational screens together with simple
// view-state navigation (PRD §8, §9). Live data channels do not exist yet, so
// the screens are mounted with empty/placeholder inputs; the app info read from
// the main process via the preload bridge is shown in the status bar to prove the
// IPC boundary end-to-end. As feature channels land, the placeholders are swapped
// for real IPC reads.

type View = "home" | "new-project" | "automation" | "mass";

const EMPTY_EXECUTIONS: readonly ExecutionSummary[] = [];

const EMPTY_MASS: MassView = {
  name: "Nova massa",
  columns: [],
  rows: [],
};

const NOOP = (): void => {
  /* placeholder until the feature channel is wired */
};

export function App(): JSX.Element {
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [view, setView] = useState<View>("home");

  useEffect(() => {
    // The bridge is absent outside Electron (e.g. plain Vite/preview, tests).
    if (typeof window.recrd === "undefined") {
      return;
    }
    let active = true;
    window.recrd
      .getAppInfo()
      .then((value) => {
        if (active) {
          setInfo(value);
        }
      })
      .catch(() => {
        /* main process unavailable — leave the status placeholder */
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <header>
        <h1>recrd-agile-testing</h1>
        {view !== "home" && (
          <nav aria-label="Navegação">
            <button type="button" onClick={() => setView("home")}>
              ← Início
            </button>
          </nav>
        )}
      </header>

      {view === "home" && (
        <HomeScreen
          recentExecutions={EMPTY_EXECUTIONS}
          onNewProject={() => setView("new-project")}
          onRecordTest={() => setView("automation")}
          onImportMass={() => setView("mass")}
          onOpenLastProject={() => setView("automation")}
        />
      )}

      {view === "new-project" && (
        <NewProjectForm
          onSubmit={(_values: NewProjectValues) => {
            // Persistence channel not wired yet; return to home after creating.
            setView("home");
          }}
        />
      )}

      {view === "automation" && (
        <AutomationScreen
          title="Nova automação"
          toolbar={{
            onPlay: NOOP,
            onPause: NOOP,
            onStop: NOOP,
            onReload: NOOP,
            onExport: NOOP,
            onCompile: NOOP,
          }}
        />
      )}

      {view === "mass" && <MassScreen mass={EMPTY_MASS} onEditValue={NOOP} />}

      <footer aria-label="Status">
        {info === null ? (
          <small>Conectando ao processo principal…</small>
        ) : (
          <small>
            {info.name} v{info.version} ({info.platform})
          </small>
        )}
      </footer>
    </div>
  );
}
