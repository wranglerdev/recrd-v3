// Typed IPC layer for the main process (PRD §3).
export { IpcRegistry, type IpcHandler } from "./typed-ipc.js";
export { bindIpcMain, type IpcMainLike } from "./electron-ipc.js";
export { registerAppHandlers } from "./handlers/app-handlers.js";
