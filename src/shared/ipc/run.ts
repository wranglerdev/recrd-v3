import { defineChannelNames, type Invoke } from "./core.js";

// `run:*` feature contract — control of a Robot Framework run (PRD §15). The
// invoke side starts/stops the run; the run's stdout streams back line-by-line
// over the `run:line` events and finishes with `run:exit` (see ./events). Pause
// maps to Stop (Robot has no pause).

export interface StartRunRequest {
  /** The project whose Robot tree (`tests/`) is executed. */
  readonly projectId: string;
}

/** Whether the run started; if not, why (already running, or no Robot path). */
export type StartRunResult =
  | { readonly started: true }
  | { readonly started: false; readonly reason: string };

export type RunChannels = {
  "run:start": { request: StartRunRequest; response: StartRunResult };
  "run:stop": { request: void; response: void };
};

export const RUN_CHANNELS = defineChannelNames<RunChannels, ["run:start", "run:stop"]>([
  "run:start",
  "run:stop",
]);

/** The slice of the renderer API served by the run feature. */
export interface RunApi {
  /** Starts a Robot run; progress streams over the `run:*` events. */
  startRun(request: StartRunRequest): Promise<StartRunResult>;
  /** Stops the current run (also used for Pause). */
  stopRun(): Promise<void>;
}

export function createRunApi(invoke: Invoke<RunChannels>): RunApi {
  return {
    startRun: (request) => invoke("run:start", request),
    stopRun: () => invoke("run:stop", undefined),
  };
}
