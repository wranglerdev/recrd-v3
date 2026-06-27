import type { JSX } from "react";
import type { ScriptActionDto } from "../../shared/ipc-contract.js";
import { Button, IconButton, StatusMessage } from "../components/ui/index.js";
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
    return <StatusMessage>Nenhuma ação gravada.</StatusMessage>;
  }

  return (
    <ol className="timeline" data-testid="timeline">
      {props.steps.map((step, index) => {
        const { action, selectors } = step;
        const field = editableField(action);
        const chosen = actionSelector(action);
        const current = selectors.find((candidate) => candidate.value === chosen);
        const unstable = current?.confidence === "low";

        return (
          <li
            className="timeline__step"
            key={index}
            data-testid="timeline-step"
            data-step-type={action.type}
          >
            <div className="timeline__head">
              <span className="timeline__index" aria-hidden="true">
                {index + 1}
              </span>
              <span className="timeline__label" data-testid="timeline-step-label">
                {describeAction(action)}
              </span>
              <div className="timeline__actions">
                <IconButton
                  label={`Mover ação ${index + 1} para cima`}
                  icon="↑"
                  disabled={index === 0}
                  onClick={() => props.onMove(index, -1)}
                />
                <IconButton
                  label={`Mover ação ${index + 1} para baixo`}
                  icon="↓"
                  disabled={index === props.steps.length - 1}
                  onClick={() => props.onMove(index, 1)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remover ação ${index + 1}`}
                  onClick={() => props.onRemove(index)}
                >
                  Remover
                </Button>
              </div>
            </div>
            {field !== null && (
              <input
                className="rc-field__control timeline__field"
                data-testid="timeline-step-field"
                aria-label={`${field.label} da ação ${index + 1}`}
                value={field.value}
                onChange={(event) =>
                  props.onUpdate(index, withEditableValue(action, event.target.value))
                }
              />
            )}
            {chosen !== null && selectors.length > 1 && (
              <select
                className="rc-field__control timeline__selector"
                data-testid="timeline-step-selector"
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
            {unstable && (
              <span className="timeline__warning" role="alert">
                {UNSTABLE_WARNING}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
