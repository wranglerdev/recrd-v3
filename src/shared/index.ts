// Shared layer — pure, cross-process contracts (no Electron/Node/DOM). Referenced
// by main, preload and renderer so the IPC boundary has a single source of truth.
export {
  IPC_CHANNELS,
  createRecrdApi,
  type AppInfo,
  type IpcChannel,
  type IpcChannelMap,
  type IpcInvoke,
  type IpcRequest,
  type IpcResponse,
  type RecrdApi,
} from "./ipc-contract.js";
export { createVersionInfo, type VersionInfo } from "./version-info.js";
