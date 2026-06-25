// Single source of truth for the typed IPC boundary (PRD §3). Lives in the
// preload (bridge) layer because it is the contract shared by main, preload and
// renderer. It contains only plain, serialisable wire types — no Node/Electron
// imports — so the renderer can depend on it without reaching into Node.

/** Wire DTO returned by `app:getInfo`. */
export type AppInfo = {
  readonly name: string;
  readonly version: string;
  readonly platform: string;
};

/**
 * The set of IPC channels. Each entry declares the request and response wire
 * types. Feature channels are added here as features land; this is the only
 * place a channel is defined.
 */
export interface IpcChannelMap {
  "app:getInfo": { request: void; response: AppInfo };
}

export type IpcChannel = keyof IpcChannelMap;
export type IpcRequest<C extends IpcChannel> = IpcChannelMap[C]["request"];
export type IpcResponse<C extends IpcChannel> = IpcChannelMap[C]["response"];

/** Every channel name, useful for binding/iteration. Keep in sync with the map. */
export const IPC_CHANNELS = ["app:getInfo"] as const satisfies readonly IpcChannel[];

/**
 * The typed API surface exposed to the renderer on `window.recrd` via
 * contextBridge. The renderer calls these methods instead of touching Node, the
 * filesystem or the database directly (PRD §3, §18).
 */
export interface RecrdApi {
  getAppInfo(): Promise<AppInfo>;
}

/** Function the renderer-side bridge uses to invoke a channel (ipcRenderer.invoke). */
export type IpcInvoke = <C extends IpcChannel>(
  channel: C,
  request: IpcRequest<C>,
) => Promise<IpcResponse<C>>;

/**
 * Builds the renderer API from an `invoke` function. Pure and injectable, so the
 * mapping from API methods to IPC channels is unit-testable without Electron.
 */
export function createRecrdApi(invoke: IpcInvoke): RecrdApi {
  return {
    getAppInfo: () => invoke("app:getInfo", undefined),
  };
}
