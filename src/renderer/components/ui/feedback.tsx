import type { HTMLAttributes, JSX, ReactNode } from "react";
import { cx } from "./cx.js";
import { Spinner } from "./Spinner.js";
import "./ui.css";

export type StatusTone = "info" | "success" | "error";

export type StatusMessageProps = Omit<HTMLAttributes<HTMLParagraphElement>, "role"> & {
  /** info → static text, success → polite live region, error → assertive alert. */
  readonly tone?: StatusTone;
  readonly children: ReactNode;
};

// Inline async-state line shared by every screen (PRD §8). The ARIA role follows
// the tone so errors are announced (alert) and successes politely updated
// (status), replacing the ad-hoc <p role="alert"> scattered across screens.
export function StatusMessage({
  tone = "info",
  children,
  className,
  ...rest
}: StatusMessageProps): JSX.Element {
  const role = tone === "error" ? "alert" : tone === "success" ? "status" : undefined;
  return (
    <p role={role} className={cx("rc-status", `rc-status--${tone}`, className)} {...rest}>
      {children}
    </p>
  );
}

export type LoadingStateProps = {
  /** Accessible + visible label, e.g. "Carregando…". */
  readonly label: string;
  readonly className?: string;
};

// Centred loading indicator reusing the Spinner's status role (PRD §8).
export function LoadingState({ label, className }: LoadingStateProps): JSX.Element {
  return (
    <div className={cx("rc-loading", className)}>
      <Spinner label={label} />
      <span className="rc-loading__label" aria-hidden="true">
        {label}
      </span>
    </div>
  );
}

export type EmptyStateProps = {
  readonly title: ReactNode;
  readonly description?: ReactNode;
  /** Optional call-to-action (e.g. a Button). */
  readonly action?: ReactNode;
  readonly className?: string;
};

// Calm placeholder for empty collections (PRD §8): a title, optional hint and an
// optional action, centred in the available space.
export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps): JSX.Element {
  return (
    <div className={cx("rc-empty", className)}>
      <p className="rc-empty__title">{title}</p>
      {description !== undefined && <p className="rc-empty__description">{description}</p>}
      {action !== undefined && <div className="rc-empty__action">{action}</div>}
    </div>
  );
}
