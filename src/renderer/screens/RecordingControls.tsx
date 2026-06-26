import type { JSX } from "react";

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
    <section aria-label="Gravação">
      <p>Gravação: {STATE_LABEL[props.state]}</p>
      {props.state === "idle" && (
        <button type="button" onClick={props.onStart}>
          Gravar
        </button>
      )}
      {props.state === "recording" && (
        <button type="button" onClick={props.onPause}>
          Pausar
        </button>
      )}
      {props.state === "paused" && (
        <button type="button" onClick={props.onResume}>
          Retomar
        </button>
      )}
      {props.state !== "idle" && (
        <button type="button" onClick={props.onStop}>
          Parar
        </button>
      )}
    </section>
  );
}
