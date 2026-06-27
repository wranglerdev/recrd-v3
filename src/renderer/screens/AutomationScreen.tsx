import { useRef, type JSX, type ReactNode } from "react";
import { Button, IconButton, Panel, Toolbar } from "../components/ui/index.js";
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

/** Icon-only transport controls (label is the accessible name). */
const TRANSPORT: { label: string; icon: string; key: keyof ToolbarHandlers }[] = [
  { label: "Play", icon: "▶", key: "onPlay" },
  { label: "Pause", icon: "❚❚", key: "onPause" },
  { label: "Stop", icon: "■", key: "onStop" },
  { label: "Reload", icon: "↻", key: "onReload" },
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
    <div className="automation">
      <header className="automation__header">
        <h1 className="automation__title">{props.title}</h1>
        <Toolbar label="Controles" className="automation__toolbar">
          {TRANSPORT.map(({ label, icon, key }) => (
            <IconButton key={key} label={label} icon={icon} onClick={props.toolbar[key]} />
          ))}
          <Toolbar.Separator />
          <Button variant="secondary" size="sm" onClick={props.toolbar.onExport}>
            Exportar
          </Button>
          <Button variant="secondary" size="sm" onClick={props.toolbar.onCompile}>
            Compilar
          </Button>
        </Toolbar>
        {props.navBar}
      </header>
      <div className="automation__body">
        <aside className="automation__sidebar" aria-label="Sidebar">
          {PANELS.map(({ label, key }) => (
            <Panel key={key} title={label}>
              {panels[key]}
            </Panel>
          ))}
          {props.sidebar}
        </aside>
        <section className="automation__sandbox" aria-label="Browser Sandbox" ref={sandboxRef} />
      </div>
    </div>
  );
}
