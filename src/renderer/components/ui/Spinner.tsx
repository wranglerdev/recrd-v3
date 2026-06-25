import type { JSX } from "react";
import { cx } from "./cx.js";
import "./ui.css";

export type SpinnerSize = "sm" | "md" | "lg";

export type SpinnerProps = {
  readonly size?: SpinnerSize;
  /** Accessible label announced to assistive tech (defaults to "Carregando"). */
  readonly label?: string;
  readonly className?: string;
};

// Indeterminate progress indicator. Exposes `role="status"` with a label so it is
// announced; the visual ring is purely decorative (PRD §8).
export function Spinner({
  size = "md",
  label = "Carregando",
  className,
}: SpinnerProps): JSX.Element {
  return (
    <span role="status" aria-live="polite" className={className}>
      <span className={cx("rc-spinner", `rc-spinner--${size}`)} aria-hidden="true" />
      <span className="rc-visually-hidden">{label}</span>
    </span>
  );
}
