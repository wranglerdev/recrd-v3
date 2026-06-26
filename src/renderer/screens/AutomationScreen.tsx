import { useRef, type JSX, type ReactNode } from "react";
import { useResizeRect, type ViewportRect } from "./use-resize-rect.js";

// Automation screen (PRD §9): header (toolbar + sandbox nav bar), a sidebar of
// named panels (Timeline / Massas / Propriedades / Toggles / Inspector) and the
// Browser Sandbox area. The sandbox itself is a BrowserView managed by the main
// process; here it is a positioned region whose bounds are reported upward so the
// container can keep the BrowserView aligned with the layout. Presentational and
// prop-driven for testability.

export type ToolbarHandlers = {
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onReload: () => void;
  onExport: () => void;
  onCompile: () => void;
};

/** Content for each named sidebar panel; omitted panels render an empty slot. */
export type AutomationPanels = {
  readonly timeline?: ReactNode;
  readonly masses?: ReactNode;
  readonly properties?: ReactNode;
  readonly toggles?: ReactNode;
  readonly inspector?: ReactNode;
};

export type AutomationScreenProps = {
  readonly title: string;
  readonly toolbar: ToolbarHandlers;
  /** Sandbox URL/navigation bar, rendered in the header (PRD §10). */
  readonly navBar?: ReactNode;
  /** Named sidebar panels (PRD §9); each is filled by its own feature. */
  readonly panels?: AutomationPanels;
  /** Free-form sidebar content (run log/result/history/export status). */
  readonly sidebar?: ReactNode;
  /** Receives the Browser Sandbox region's rect so the container can position the view. */
  readonly onSandboxViewportChange?: (rect: ViewportRect | null) => void;
};

const TOOLBAR_BUTTONS: { label: string; key: keyof ToolbarHandlers }[] = [
  { label: "Play", key: "onPlay" },
  { label: "Pause", key: "onPause" },
  { label: "Stop", key: "onStop" },
  { label: "Reload", key: "onReload" },
  { label: "Exportar", key: "onExport" },
  { label: "Compilar", key: "onCompile" },
];

const PANELS: { label: string; key: keyof AutomationPanels }[] = [
  { label: "Timeline", key: "timeline" },
  { label: "Massas", key: "masses" },
  { label: "Propriedades", key: "properties" },
  { label: "Toggles", key: "toggles" },
  { label: "Inspector", key: "inspector" },
];

const NO_OP = (): void => {
  /* default: no viewport listener */
};

export function AutomationScreen(props: AutomationScreenProps): JSX.Element {
  const sandboxRef = useRef<HTMLElement | null>(null);
  useResizeRect(sandboxRef, props.onSandboxViewportChange ?? NO_OP);

  const panels = props.panels ?? {};

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
        {props.navBar}
      </header>
      <div>
        <aside aria-label="Sidebar">
          {PANELS.map(({ label, key }) => (
            <section key={key} aria-label={label}>
              <h2>{label}</h2>
              {panels[key]}
            </section>
          ))}
          {props.sidebar}
        </aside>
        <section aria-label="Browser Sandbox" ref={sandboxRef} />
      </div>
    </div>
  );
}
