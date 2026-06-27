import type { JSX } from "react";
import { Button, Panel } from "../components/ui/index.js";

// Recording lifecycle controls (PRD §10): start a capture session, pause/resume
// it, or stop it. Presentational — the state and transitions are owned by the
// container so capture only records while the session is active.

export type RecordingState = "idle" | "recording" | "paused";

export type RecordingControlsProps = {
  readonly state: RecordingState;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
};

const STATE_LABEL: Record<RecordingState, string> = {
  idle: "Parada",
  recording: "Gravando…",
  paused: "Pausada",
};

export function RecordingControls(props: RecordingControlsProps): JSX.Element {
  return (
    <Panel title="Gravação">
      <div className="recording">
        <p className="recording__state" data-testid="recording-state" data-state={props.state}>
          <span className="recording__dot" aria-hidden="true" />
          Gravação: {STATE_LABEL[props.state]}
        </p>
        <div className="rc-form__actions">
          {props.state === "idle" && (
            <Button size="sm" data-testid="recording-start" onClick={props.onStart}>
              Gravar
            </Button>
          )}
          {props.state === "recording" && (
            <Button
              size="sm"
              variant="secondary"
              data-testid="recording-pause"
              onClick={props.onPause}
            >
              Pausar
            </Button>
          )}
          {props.state === "paused" && (
            <Button
              size="sm"
              variant="secondary"
              data-testid="recording-resume"
              onClick={props.onResume}
            >
              Retomar
            </Button>
          )}
          {props.state !== "idle" && (
            <Button
              size="sm"
              variant="secondary"
              data-testid="recording-stop"
              onClick={props.onStop}
            >
              Parar
            </Button>
          )}
        </div>
      </div>
    </Panel>
  );
}
