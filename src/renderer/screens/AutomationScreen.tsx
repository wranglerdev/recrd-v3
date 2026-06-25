import type { JSX, ReactNode } from "react";

// Automation screen (PRD §9): header toolbar + sidebar + Browser Sandbox area.
// The sandbox itself is a BrowserView managed by the main process; here it is a
// placeholder region. Presentational and prop-driven for testability.

export type ToolbarHandlers = {
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onReload: () => void;
  onExport: () => void;
  onCompile: () => void;
};

export type AutomationScreenProps = {
  readonly title: string;
  readonly toolbar: ToolbarHandlers;
  readonly sidebar?: ReactNode;
};

const TOOLBAR_BUTTONS: { label: string; key: keyof ToolbarHandlers }[] = [
  { label: "Play", key: "onPlay" },
  { label: "Pause", key: "onPause" },
  { label: "Stop", key: "onStop" },
  { label: "Reload", key: "onReload" },
  { label: "Exportar", key: "onExport" },
  { label: "Compilar", key: "onCompile" },
];

export function AutomationScreen(props: AutomationScreenProps): JSX.Element {
  return (
    <div>
      <header>
        <h1>{props.title}</h1>
        <nav aria-label="Controles">
          {TOOLBAR_BUTTONS.map(({ label, key }) => (
            <button key={key} type="button" onClick={props.toolbar[key]}>
              {label}
            </button>
          ))}
        </nav>
      </header>
      <div>
        <aside aria-label="Sidebar">{props.sidebar}</aside>
        <section aria-label="Browser Sandbox" />
      </div>
    </div>
  );
}
