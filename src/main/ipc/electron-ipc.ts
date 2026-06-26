import type { IpcChannel, IpcRequest } from "../../shared/ipc-contract.js";
import type { Logger } from "../infrastructure/logging/logger.js";
import { toIpcHandlerError } from "./ipc-error.js";
import type { IpcRegistry } from "./typed-ipc.js";

// Thin binding from the transport-agnostic IpcRegistry to Electron's ipcMain.
// `IpcMainLike` is the minimal slice of ipcMain used here, so the wiring can be
// unit-tested with a fake (Electron's ipcMain satisfies it structurally). Every
// dispatch is wrapped so a handler failure is logged server-side (with the
// request redacted by the structured logger) and surfaced to the renderer as a
// serialisable, friendly IpcHandlerError (PRD §18, §31).

export interface IpcMainLike {
  handle(channel: string, listener: (event: unknown, request: unknown) => unknown): void;
}

/**
 * Registers every channel in the registry on ipcMain, routing to dispatch. When a
 * handler throws, the error is logged (channel + redacted request + cause) via the
 * optional logger and re-thrown as an {@link IpcHandlerError} so the renderer's
 * `invoke` rejects with a clean, serialisable message instead of a raw stack.
 */
export function bindIpcMain(registry: IpcRegistry, ipcMain: IpcMainLike, logger?: Logger): void {
  for (const channel of registry.channels()) {
    // The Electron boundary is untyped; the registry re-narrows per channel.
    ipcMain.handle(channel, async (_event, request) => {
      try {
        return await registry.dispatch(channel, request as IpcRequest<IpcChannel>);
      } catch (error) {
        // The logger redacts `meta` by key, so a request carrying a
        // password/secret is masked before it reaches a transport (PRD §18). The
        // error name/message/stack are surfaced explicitly because Error's own
        // properties are non-enumerable and would otherwise be lost.
        logger?.error("IPC handler failed", {
          channel,
          request,
          error:
            error instanceof Error
              ? { name: error.name, message: error.message, stack: error.stack }
              : String(error),
        });
        throw toIpcHandlerError(channel, error);
      }
    });
  }
}
