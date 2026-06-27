import type { JSX, ReactNode } from "react";
import { cx } from "./cx.js";
import "./ui.css";

export type PageProps = {
  readonly title: ReactNode;
  /** Optional sub-heading shown under the title. */
  readonly description?: ReactNode;
  /** Optional controls rendered on the right of the page header. */
  readonly actions?: ReactNode;
  /** Accessible name for the page region; defaults to the title when a string. */
  readonly label?: string;
  readonly children: ReactNode;
  readonly className?: string;
};

// Standard screen scaffold (PRD §8, §9): a titled header (with optional
// description + actions), a constrained content column and consistent vertical
// rhythm, so every screen shares one layout instead of bare <section><h2>.
export function Page({
  title,
  description,
  actions,
  label,
  children,
  className,
}: PageProps): JSX.Element {
  const ariaLabel = label ?? (typeof title === "string" ? title : undefined);
  return (
    <section className={cx("rc-page", className)} aria-label={ariaLabel}>
      <header className="rc-page__header">
        <div className="rc-page__heading">
          <h1 className="rc-page__title">{title}</h1>
          {description !== undefined && <p className="rc-page__description">{description}</p>}
        </div>
        {actions !== undefined && <div className="rc-page__actions">{actions}</div>}
      </header>
      <div className="rc-page__body">{children}</div>
    </section>
  );
}
