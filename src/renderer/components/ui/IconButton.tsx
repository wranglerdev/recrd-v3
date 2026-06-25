import type { ButtonHTMLAttributes, JSX, ReactNode } from "react";
import { cx } from "./cx.js";
import "./ui.css";

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
  /** Required: icon-only controls have no visible text, so a label is mandatory. */
  readonly label: string;
  /** The icon node (glyph, svg, …). Marked decorative — the label names it. */
  readonly icon: ReactNode;
  /** Toggle state; when defined, renders as a pressable toggle (aria-pressed). */
  readonly pressed?: boolean;
};

// Compact, icon-only button. Enforces an accessible name via the required
// `label` prop so it is never an unlabelled control (PRD §8).
export function IconButton({
  label,
  icon,
  pressed,
  type,
  className,
  ...rest
}: IconButtonProps): JSX.Element {
  return (
    <button
      type={type ?? "button"}
      className={cx("rc-icon-btn", className)}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      {...rest}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}
