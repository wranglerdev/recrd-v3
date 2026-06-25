import { useState, type JSX, type ReactNode } from "react";
import { cx } from "./cx.js";
import "./ui.css";

export type TreeNode = {
  readonly id: string;
  readonly label: ReactNode;
  readonly children?: readonly TreeNode[];
  /** Initial expanded state for nodes that have children. */
  readonly defaultExpanded?: boolean;
};

export type TreeProps = {
  readonly label: string;
  readonly nodes: readonly TreeNode[];
  readonly selectedId?: string;
  readonly onSelect?: (id: string) => void;
  readonly className?: string;
};

// Hierarchical disclosure tree for the Project > Plan > Suite > Case structure
// (PRD §6, §9). Implements the WAI-ARIA tree pattern: a `tree` container with
// `treeitem` nodes, `aria-expanded` on branches and `aria-selected` on the
// active node, so screen readers convey depth and state.
export function Tree({ label, nodes, selectedId, onSelect, className }: TreeProps): JSX.Element {
  return (
    <ul role="tree" aria-label={label} className={cx("rc-tree", className)}>
      {nodes.map((node) => (
        <TreeItem key={node.id} node={node} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </ul>
  );
}

type TreeItemProps = {
  readonly node: TreeNode;
  readonly selectedId: string | undefined;
  readonly onSelect: ((id: string) => void) | undefined;
};

function TreeItem({ node, selectedId, onSelect }: TreeItemProps): JSX.Element {
  const hasChildren = node.children !== undefined && node.children.length > 0;
  const [expanded, setExpanded] = useState(node.defaultExpanded ?? false);
  const selected = node.id === selectedId;

  const handleSelect = (): void => {
    if (hasChildren) {
      setExpanded((value) => !value);
    }
    onSelect?.(node.id);
  };

  return (
    <li role="treeitem" aria-selected={selected} aria-expanded={hasChildren ? expanded : undefined}>
      <div
        className="rc-tree__node"
        onClick={handleSelect}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleSelect();
          }
        }}
        role="presentation"
      >
        <span className="rc-tree__twisty" aria-hidden="true">
          {hasChildren ? (expanded ? "▾" : "▸") : ""}
        </span>
        {node.label}
      </div>
      {hasChildren && expanded && (
        <ul role="group" className="rc-tree__group">
          {node.children?.map((child) => (
            <TreeItem key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  );
}
