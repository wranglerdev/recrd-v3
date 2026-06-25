import type { RecrdApi } from "../shared/ipc-contract.js";

// The typed bridge exposed by the preload via contextBridge (PRD §3). This is
// the renderer's only channel to the main process — it never accesses Node, the
// database or the filesystem directly.
declare global {
  interface Window {
    readonly recrd: RecrdApi;
  }
}

export {};
