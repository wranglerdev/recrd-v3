// Typed main→renderer event channels (PRD §15). The request/response `invoke`
// boundary (ipc-contract) cannot push: long-running work in the main process
// streams progress to the renderer via these one-way events. The preload exposes
// a typed `subscribe`; the renderer consumes it through the useIpcEvent hook.
//
// Lives in the shared layer (plain, serialisable payloads, no Node/Electron) so
// main, preload and renderer share one contract.

import type { ScriptActionDto } from "./compile.js";

/** A line of streamed install/run output. */
export interface StreamLineEvent {
  readonly line: string;
}

/** A candidate selector for a captured element (PRD §11), ranked by the generator. */
export interface SelectorCandidateDto {
  readonly strategy: string;
  readonly value: string;
  readonly confidence: "high" | "low";
  readonly stable: boolean;
}

/**
 * An action captured in the Browser Sandbox (PRD §10). The sandbox content-script
 * maps a DOM interaction to a script action and the main process forwards it to
 * the renderer's recording session. For element-based actions it also carries the
 * ranked selector candidates (PRD §11) so the renderer can warn about a
 * low-confidence pick and let the user choose an alternative.
 */
export interface CapturedActionEvent {
  readonly action: ScriptActionDto;
  readonly selectors?: readonly SelectorCandidateDto[];
}

/** Completion of a streamed install: ok, or the command that failed. */
export interface InstallDoneEvent {
  readonly ok: boolean;
  readonly failedCommand: string | null;
}

/** Exit of a streamed Robot run, with the process exit code (PRD §15). */
export interface RunExitEvent {
  readonly exitCode: number;
}

export type IpcEventMap = {
  "env:install:line": StreamLineEvent;
  "env:install:done": InstallDoneEvent;
  "run:line": StreamLineEvent;
  "run:exit": RunExitEvent;
  "capture:action": CapturedActionEvent;
};

export type IpcEventChannel = keyof IpcEventMap;

export const IPC_EVENT_CHANNELS = [
  "env:install:line",
  "env:install:done",
  "run:line",
  "run:exit",
  "capture:action",
] as const satisfies readonly IpcEventChannel[];

export type IpcEventListener<C extends IpcEventChannel> = (payload: IpcEventMap[C]) => void;

/**
 * Renderer-side subscription surface exposed by the preload bridge on
 * `window.recrdEvents`. `subscribe` returns an unsubscribe function.
 */
export interface IpcEvents {
  subscribe<C extends IpcEventChannel>(channel: C, listener: IpcEventListener<C>): () => void;
}
