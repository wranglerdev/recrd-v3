import type { JSX } from "react";
import type { ScriptActionDto } from "../../shared/ipc-contract.js";
import { describeAction, editableField, withEditableValue } from "./action-format.js";

// Editable timeline of recorded actions (PRD §9, §13). Lists the captured steps
// in order and lets the user edit the primary field, reorder (up/down) or remove
// each one. Presentational: mutations are delegated to the recording session so
// they persist into the manual script.

export type TimelinePanelProps = {
  readonly actions: readonly ScriptActionDto[];
  onRemove: (index: number) => void;
  onMove: (index: number, delta: number) => void;
  onUpdate: (index: number, action: ScriptActionDto) => void;
};

export function TimelinePanel(props: TimelinePanelProps): JSX.Element {
  if (props.actions.length === 0) {
    return <p>Nenhuma ação gravada.</p>;
  }

  return (
    <ol>
      {props.actions.map((action, index) => {
        const field = editableField(action);
        return (
          <li key={index}>
            <span>{describeAction(action)}</span>
            {field !== null && (
              <input
                aria-label={`${field.label} da ação ${index + 1}`}
                value={field.value}
                onChange={(event) =>
                  props.onUpdate(index, withEditableValue(action, event.target.value))
                }
              />
            )}
            <button
              type="button"
              aria-label={`Mover ação ${index + 1} para cima`}
              disabled={index === 0}
              onClick={() => props.onMove(index, -1)}
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={`Mover ação ${index + 1} para baixo`}
              disabled={index === props.actions.length - 1}
              onClick={() => props.onMove(index, 1)}
            >
              ↓
            </button>
            <button
              type="button"
              aria-label={`Remover ação ${index + 1}`}
              onClick={() => props.onRemove(index)}
            >
              Remover
            </button>
          </li>
        );
      })}
    </ol>
  );
}
