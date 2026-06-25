import { contextBridge, ipcRenderer } from "electron";
import { createRecrdApi, type IpcInvoke } from "../shared/ipc-contract.js";

// Preload bridge. With contextIsolation: true and nodeIntegration: false, the
// renderer cannot touch Node, the database or the filesystem (PRD §3, §18). The
// only capability it receives is the typed `window.recrd` API, whose every call
// is forwarded to a registered main-process IPC handler.
const invoke: IpcInvoke = (channel, request) => ipcRenderer.invoke(channel, request);

contextBridge.exposeInMainWorld("recrd", createRecrdApi(invoke));
