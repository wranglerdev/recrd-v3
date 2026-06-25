import type { IpcChannel, IpcRequest } from "../../shared/ipc-contract.js";
import type { IpcRegistry } from "./typed-ipc.js";

// Thin binding from the transport-agnostic IpcRegistry to Electron's ipcMain.
// `IpcMainLike` is the minimal slice of ipcMain used here, so the wiring can be
// unit-tested with a fake (Electron's ipcMain satisfies it structurally).

export interface IpcMainLike {
  handle(channel: string, listener: (event: unknown, request: unknown) => unknown): void;
}

/** Registers every channel in the registry on ipcMain, routing to dispatch. */
export function bindIpcMain(registry: IpcRegistry, ipcMain: IpcMainLike): void {
  for (const channel of registry.channels()) {
    // The Electron boundary is untyped; the registry re-narrows per channel.
    ipcMain.handle(channel, (_event, request) =>
      registry.dispatch(channel, request as IpcRequest<IpcChannel>),
    );
  }
}
