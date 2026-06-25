import type { JSX, ReactNode } from "react";
import { cx } from "./cx.js";
import "./ui.css";

export type ToolbarProps = {
  /** Accessible name for the toolbar (e.g. "Controles de gravação"). */
  readonly label: string;
  readonly children: ReactNode;
  readonly className?: string;
};

// Horizontal grouping of controls with `role="toolbar"` semantics (PRD §9). Use
// `Toolbar.Separator` / `Toolbar.Spacer` to structure the control groups.
export function Toolbar({ label, children, className }: ToolbarProps): JSX.Element {
  return (
    <div role="toolbar" aria-label={label} className={cx("rc-toolbar", className)}>
      {children}
    </div>
  );
}

function Separator(): JSX.Element {
  return <span className="rc-toolbar__separator" role="separator" aria-orientation="vertical" />;
}

function Spacer(): JSX.Element {
  return <span className="rc-toolbar__spacer" aria-hidden="true" />;
}

Toolbar.Separator = Separator;
Toolbar.Spacer = Spacer;
