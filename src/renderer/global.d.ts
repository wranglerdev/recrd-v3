import type { IpcEvents, RecrdApi } from "../shared/ipc-contract.js";

// The typed bridge exposed by the preload via contextBridge (PRD §3). This is
// the renderer's only channel to the main process — it never accesses Node, the
// database or the filesystem directly. `recrdEvents` carries one-way main→renderer
// streams (e.g. install progress).
declare global {
  interface Window {
    readonly recrd: RecrdApi;
    readonly recrdEvents: IpcEvents;
  }
}

export {};
