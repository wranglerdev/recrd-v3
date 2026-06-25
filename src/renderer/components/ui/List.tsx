import type { JSX, ReactNode } from "react";
import { cx } from "./cx.js";
import "./ui.css";

export type ListProps = {
  readonly label?: string;
  readonly children: ReactNode;
  readonly className?: string;
};

export type ListItemProps = {
  /** Marks the row as the currently active item (`aria-current`). */
  readonly selected?: boolean;
  /** Click handler; when present the item is rendered as an interactive button. */
  readonly onSelect?: () => void;
  readonly children: ReactNode;
  readonly className?: string;
};

// A vertical list backed by semantic `<ul>`/`<li>`. Interactive rows are real
// buttons (focusable, keyboard-operable) and mark selection with `aria-current`
// so it is announced without requiring a full listbox keyboard contract
// (PRD §8).
export function List({ label, children, className }: ListProps): JSX.Element {
  return (
    <ul className={cx("rc-list", className)} aria-label={label}>
      {children}
    </ul>
  );
}

function ListItem({ selected, onSelect, children, className }: ListItemProps): JSX.Element {
  const interactive = onSelect !== undefined;
  return (
    <li>
      {interactive ? (
        <button
          type="button"
          aria-current={selected ? "true" : undefined}
          onClick={onSelect}
          className={cx("rc-list__item", "rc-list__item--interactive", className)}
        >
          {children}
        </button>
      ) : (
        <div className={cx("rc-list__item", className)}>{children}</div>
      )}
    </li>
  );
}

List.Item = ListItem;
