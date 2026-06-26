import type { JSX } from "react";
import type { ScriptActionDto } from "../../shared/ipc-contract.js";
import type { RecordedStep } from "../state/useRecordingSession.js";
import {
  actionSelector,
  describeAction,
  editableField,
  withEditableValue,
  withSelector,
} from "./action-format.js";

// Editable timeline of recorded steps (PRD §9, §11, §13). Lists the captured
// steps in order and lets the user edit the primary field, reorder (up/down) or
// remove each one. When a step's chosen selector is low-confidence it shows an
// instability warning and offers the ranked selector alternatives (PRD §11).
// Presentational: mutations are delegated to the recording session so they
// persist into the manual script.

const UNSTABLE_WARNING = "⚠ Seletor instável. Escolha uma alternativa.";

export type TimelinePanelProps = {
  readonly steps: readonly RecordedStep[];
  onRemove: (index: number) => void;
  onMove: (index: number, delta: number) => void;
  onUpdate: (index: number, action: ScriptActionDto) => void;
};

export function TimelinePanel(props: TimelinePanelProps): JSX.Element {
  if (props.steps.length === 0) {
    return <p>Nenhuma ação gravada.</p>;
  }

  return (
    <ol>
      {props.steps.map((step, index) => {
        const { action, selectors } = step;
        const field = editableField(action);
        const chosen = actionSelector(action);
        const current = selectors.find((candidate) => candidate.value === chosen);
        const unstable = current?.confidence === "low";

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
            {chosen !== null && selectors.length > 1 && (
              <select
                aria-label={`Seletor da ação ${index + 1}`}
                value={chosen}
                onChange={(event) =>
                  props.onUpdate(index, withSelector(action, event.target.value))
                }
              >
                {selectors.map((candidate) => (
                  <option key={candidate.value} value={candidate.value}>
                    {candidate.value} ({candidate.strategy})
                  </option>
                ))}
              </select>
            )}
            {unstable && <span role="alert">{UNSTABLE_WARNING}</span>}
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
              disabled={index === props.steps.length - 1}
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
