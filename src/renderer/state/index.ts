// Barrel for the renderer's global state and typed bridge access (PRD §3, §8).
export { getBridge, useBridge } from "./bridge.js";
export { getEventBridge, useIpcEvent } from "./events.js";
export {
  useIpcQuery,
  useIpcAction,
  errorMessage,
  type AsyncState,
  type AsyncStatus,
} from "./useIpc.js";
export {
  ActiveProjectProvider,
  useActiveProject,
  type ActiveProjectContextValue,
  type ActiveCase,
} from "./active-project.js";
