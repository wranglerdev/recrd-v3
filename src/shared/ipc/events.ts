// Typed main→renderer event channels (PRD §15). The request/response `invoke`
// boundary (ipc-contract) cannot push: long-running work in the main process
// streams progress to the renderer via these one-way events. The preload exposes
// a typed `subscribe`; the renderer consumes it through the useIpcEvent hook.
//
// Lives in the shared layer (plain, serialisable payloads, no Node/Electron) so
// main, preload and renderer share one contract.

/** A line of streamed install/run output. */
export interface StreamLineEvent {
  readonly line: string;
}

/** Completion of a streamed install: ok, or the command that failed. */
export interface InstallDoneEvent {
  readonly ok: boolean;
  readonly failedCommand: string | null;
}

export type IpcEventMap = {
  "env:install:line": StreamLineEvent;
  "env:install:done": InstallDoneEvent;
};

export type IpcEventChannel = keyof IpcEventMap;

export const IPC_EVENT_CHANNELS = [
  "env:install:line",
  "env:install:done",
] as const satisfies readonly IpcEventChannel[];

export type IpcEventListener<C extends IpcEventChannel> = (payload: IpcEventMap[C]) => void;

/**
 * Renderer-side subscription surface exposed by the preload bridge on
 * `window.recrdEvents`. `subscribe` returns an unsubscribe function.
 */
export interface IpcEvents {
  subscribe<C extends IpcEventChannel>(channel: C, listener: IpcEventListener<C>): () => void;
}
