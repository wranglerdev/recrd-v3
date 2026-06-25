import { useId, type JSX, type ReactNode } from "react";
import { cx } from "./cx.js";
import "./ui.css";

export type PanelProps = {
  readonly title?: ReactNode;
  /** Optional controls rendered on the right of the header (e.g. buttons). */
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
};

// A titled surface used to group content (PRD §8, §9). When a title is given the
// region is labelled by it, so screen-reader users get the grouping semantics.
export function Panel({ title, actions, children, className }: PanelProps): JSX.Element {
  const titleId = useId();
  const hasTitle = title !== undefined;

  return (
    <section className={cx("rc-panel", className)} aria-labelledby={hasTitle ? titleId : undefined}>
      {(hasTitle || actions !== undefined) && (
        <header className="rc-panel__header">
          {hasTitle ? (
            <h2 id={titleId} className="rc-panel__title">
              {title}
            </h2>
          ) : (
            <span />
          )}
          {actions !== undefined && <div className="rc-panel__actions">{actions}</div>}
        </header>
      )}
      <div className="rc-panel__body">{children}</div>
    </section>
  );
}
