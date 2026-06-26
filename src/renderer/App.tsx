import { useState, type JSX } from "react";
import type { AppInfo } from "../shared/ipc-contract.js";
import { HomeScreen, type ExecutionSummary } from "./screens/HomeScreen.js";
import { AutomationScreen } from "./screens/AutomationScreen.js";
import { MassScreen, type MassView } from "./screens/MassScreen.js";
import { NewProjectScreen } from "./screens/NewProjectScreen.js";
import { AboutScreen } from "./screens/AboutScreen.js";
import { SettingsScreen } from "./screens/SettingsScreen.js";
import { GitPanel } from "./screens/GitPanel.js";
import { ActiveProjectProvider, useBridge, useIpcQuery } from "./state/index.js";
import "./styles/app-shell.css";

// Application shell (PRD §8, §9): a persistent navigation sidebar, a main content
// area driven by typed view-state routing, and a status bar that proves the IPC
// boundary by showing the app info read from the main process via the preload
// bridge. Live data channels do not exist yet, so the screens are mounted with
// empty/placeholder inputs; as feature channels land the placeholders are swapped
// for real IPC reads.

type View = "home" | "new-project" | "automation" | "mass" | "git" | "about" | "settings";

type NavItem = {
  readonly view: View;
  readonly label: string;
  readonly icon: string;
};

// Primary destinations shown in the sidebar. "new-project" is a transient form
// reached from the Home quick actions, so it is intentionally not a nav item.
const NAV_ITEMS: readonly NavItem[] = [
  { view: "home", label: "Início", icon: "⌂" },
  { view: "automation", label: "Automação", icon: "⏺" },
  { view: "mass", label: "Massas", icon: "▦" },
  { view: "git", label: "Git", icon: "⎇" },
  { view: "settings", label: "Configurações", icon: "⚙" },
  { view: "about", label: "Sobre", icon: "ⓘ" },
];

const EMPTY_EXECUTIONS: readonly ExecutionSummary[] = [];

const EMPTY_MASS: MassView = {
  name: "Nova massa",
  columns: [],
  rows: [],
};

const NOOP = (): void => {
  /* placeholder until the feature channel is wired */
};

function useAppInfo(): AppInfo | null {
  // The bridge is absent outside Electron (plain Vite/preview, tests); the query
  // stays idle and the status bar keeps its "connecting" placeholder.
  const bridge = useBridge();
  const { data } = useIpcQuery<AppInfo>(bridge === null ? null : () => bridge.getAppInfo(), [
    bridge,
  ]);
  return data;
}

export function App(): JSX.Element {
  const info = useAppInfo();
  const [view, setView] = useState<View>("home");

  return (
    <ActiveProjectProvider>
      <div className="app-shell">
        <aside className="app-shell__sidebar">
          <h1 className="app-shell__brand">recrd-agile-testing</h1>
          <nav className="app-shell__nav" aria-label="Navegação principal">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.view}
                type="button"
                className="app-shell__nav-item"
                aria-current={view === item.view ? "page" : undefined}
                onClick={() => setView(item.view)}
              >
                <span className="app-shell__nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="app-shell__main">{renderView(view, setView)}</main>

        <footer className="app-shell__status" aria-label="Status">
          {info === null ? (
            <small>Conectando ao processo principal…</small>
          ) : (
            <small>
              {info.name} v{info.version} ({info.platform})
            </small>
          )}
        </footer>
      </div>
    </ActiveProjectProvider>
  );
}

function renderView(view: View, setView: (view: View) => void): JSX.Element {
  switch (view) {
    case "home":
      return (
        <HomeScreen
          recentExecutions={EMPTY_EXECUTIONS}
          onNewProject={() => setView("new-project")}
          onRecordTest={() => setView("automation")}
          onImportMass={() => setView("mass")}
          onOpenLastProject={() => setView("automation")}
        />
      );
    case "new-project":
      // Wired flow: persists via IPC (and scaffolds a Robot repo for "novo
      // repo"), then returns home with the new project selected as active.
      return <NewProjectScreen onCreated={() => setView("home")} />;
    case "automation":
      return (
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
      );
    case "mass":
      return <MassScreen mass={EMPTY_MASS} onEditValue={NOOP} />;
    case "about":
      return <AboutScreen />;
    case "settings":
      return <SettingsScreen />;
    case "git":
      return <GitPanel />;
  }
}
