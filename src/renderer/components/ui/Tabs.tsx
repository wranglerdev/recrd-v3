import { useId, useState, type JSX, type ReactNode } from "react";
import { cx } from "./cx.js";
import "./ui.css";

export type TabItem = {
  readonly id: string;
  readonly label: ReactNode;
  readonly content: ReactNode;
  readonly disabled?: boolean;
};

export type TabsProps = {
  readonly label: string;
  readonly tabs: readonly TabItem[];
  /** Controlled active tab id. Omit for uncontrolled (defaults to the first). */
  readonly activeId?: string;
  readonly onChange?: (id: string) => void;
  readonly className?: string;
};

// Tabbed disclosure following the WAI-ARIA tabs pattern: a `tablist` of `tab`
// buttons wired to `tabpanel`s via aria-controls/labelledby, with arrow-key
// roving focus between tabs (PRD §8, §11).
export function Tabs({ label, tabs, activeId, onChange, className }: TabsProps): JSX.Element {
  const baseId = useId();
  const [internalId, setInternalId] = useState(tabs[0]?.id);
  const selectedId = activeId ?? internalId;

  const select = (id: string): void => {
    setInternalId(id);
    onChange?.(id);
  };

  const focusableTabs = tabs.filter((tab) => !tab.disabled);

  const handleKeyDown = (event: React.KeyboardEvent, currentId: string): void => {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(event.key)) {
      return;
    }
    event.preventDefault();
    const index = focusableTabs.findIndex((tab) => tab.id === currentId);
    let next = index;
    if (event.key === "ArrowRight") {
      next = (index + 1) % focusableTabs.length;
    } else if (event.key === "ArrowLeft") {
      next = (index - 1 + focusableTabs.length) % focusableTabs.length;
    } else if (event.key === "Home") {
      next = 0;
    } else {
      next = focusableTabs.length - 1;
    }
    const target = focusableTabs[next];
    if (target !== undefined) {
      select(target.id);
    }
  };

  const activeTab = tabs.find((tab) => tab.id === selectedId);

  return (
    <div className={className}>
      <div role="tablist" aria-label={label} className="rc-tabs__list">
        {tabs.map((tab) => {
          const isSelected = tab.id === selectedId;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={isSelected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={isSelected ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => select(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, tab.id)}
              className={cx("rc-tabs__tab")}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {activeTab !== undefined && (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${activeTab.id}`}
          aria-labelledby={`${baseId}-tab-${activeTab.id}`}
          tabIndex={0}
          className="rc-tabs__panel"
        >
          {activeTab.content}
        </div>
      )}
    </div>
  );
}
