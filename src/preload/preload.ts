import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import { createRecrdApi, type IpcInvoke } from "../shared/ipc-contract.js";
import { IPC_EVENT_CHANNELS, type IpcEvents } from "../shared/ipc/events.js";

// Preload bridge. With contextIsolation: true and nodeIntegration: false, the
// renderer cannot touch Node, the database or the filesystem (PRD §3, §18). The
// only capabilities it receives are the typed `window.recrd` invoke API and the
// `window.recrdEvents` subscription surface, both forwarded to the main process.
const invoke: IpcInvoke = (channel, request) => ipcRenderer.invoke(channel, request);

contextBridge.exposeInMainWorld("recrd", createRecrdApi(invoke));

// One-way main→renderer events (PRD §15). Subscriptions are restricted to the
// known event channels so the renderer cannot listen on arbitrary IPC.
const events: IpcEvents = {
  subscribe(channel, listener) {
    if (!IPC_EVENT_CHANNELS.includes(channel)) {
      throw new Error(`Canal de evento desconhecido: ${channel}`);
    }
    const handler = (_event: IpcRendererEvent, payload: unknown): void =>
      listener(payload as never);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
};

contextBridge.exposeInMainWorld("recrdEvents", events);
