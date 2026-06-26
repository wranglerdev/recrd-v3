import type { IpcEventChannel, IpcEventMap } from "../../shared/ipc/events.js";

// Main→renderer event emitter (PRD §15). Pushes typed events to the renderer's
// webContents. The target is set after the BrowserWindow is created (the IPC
// registry is built before the window exists), so it is mutable and emits are
// dropped until a target is attached.

/** Minimal sink the emitter forwards to — satisfied by Electron's webContents. */
export interface EventSink {
  send(channel: string, payload: unknown): void;
}

export interface IpcEventEmitter {
  emit<C extends IpcEventChannel>(channel: C, payload: IpcEventMap[C]): void;
}

export interface SettableIpcEventEmitter extends IpcEventEmitter {
  /** Points the emitter at a renderer sink (or null to detach). */
  setTarget(target: EventSink | null): void;
}

export function createIpcEventEmitter(): SettableIpcEventEmitter {
  let target: EventSink | null = null;
  return {
    setTarget(next) {
      target = next;
    },
    emit(channel, payload) {
      target?.send(channel, payload);
    },
  };
}
