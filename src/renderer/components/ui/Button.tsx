import type { ButtonHTMLAttributes, JSX, ReactNode } from "react";
import { cx } from "./cx.js";
import { Spinner } from "./Spinner.js";
import "./ui.css";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  /** Stretch to the width of the container. */
  readonly block?: boolean;
  /** Shows a spinner and disables the button while an action is in flight. */
  readonly loading?: boolean;
  readonly children: ReactNode;
};

// Primary text button. Defaults to `type="button"` so it never accidentally
// submits a form; pass `type="submit"` explicitly when inside a form (PRD §8).
export function Button({
  variant = "primary",
  size = "md",
  block = false,
  loading = false,
  disabled = false,
  type,
  className,
  children,
  ...rest
}: ButtonProps): JSX.Element {
  return (
    <button
      type={type ?? "button"}
      className={cx(
        "rc-btn",
        `rc-btn--${variant}`,
        `rc-btn--${size}`,
        block && "rc-btn--block",
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner size="sm" className="rc-btn__spinner" />}
      {children}
    </button>
  );
}
