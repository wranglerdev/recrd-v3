import { describe, expect, it } from "vitest";
import { bindIpcMain, type IpcMainLike } from "@main/ipc/electron-ipc";
import { IpcHandlerError } from "@main/ipc/ipc-error";
import { IpcRegistry } from "@main/ipc/typed-ipc";
import { SinkLogger, type LogSink } from "@main/infrastructure/logging/logger";

function fakeIpcMain(): IpcMainLike & {
  listeners: Map<string, (event: unknown, request: unknown) => unknown>;
} {
  const listeners = new Map<string, (event: unknown, request: unknown) => unknown>();
  return {
    listeners,
    handle(channel, listener) {
      listeners.set(channel, listener);
    },
  };
}

describe("bindIpcMain", () => {
  it("registers every channel of the registry on ipcMain", () => {
    const registry = new IpcRegistry();
    registry.handle("app:getInfo", () => ({ name: "recrd", version: "0.1.0", platform: "linux" }));
    const ipcMain = fakeIpcMain();

    bindIpcMain(registry, ipcMain);

    expect([...ipcMain.listeners.keys()]).toEqual(["app:getInfo"]);
  });

  it("routes invocations through the registry to the handler", async () => {
    const registry = new IpcRegistry();
    registry.handle("app:getInfo", () => ({ name: "recrd", version: "2.0.0", platform: "win32" }));
    const ipcMain = fakeIpcMain();
    bindIpcMain(registry, ipcMain);

    const listener = ipcMain.listeners.get("app:getInfo");
    await expect(listener?.({}, undefined)).resolves.toEqual({
      name: "recrd",
      version: "2.0.0",
      platform: "win32",
    });
  });

  it("re-throws a handler failure as a serialisable IpcHandlerError", async () => {
    const registry = new IpcRegistry();
    registry.handle("project:open", () => {
      throw new Error("Projeto não encontrado: p1");
    });
    const ipcMain = fakeIpcMain();
    bindIpcMain(registry, ipcMain);

    const listener = ipcMain.listeners.get("project:open");
    await expect(listener?.({}, { id: "p1" })).rejects.toMatchObject({
      name: "IpcHandlerError",
      channel: "project:open",
      message: "Projeto não encontrado: p1",
    });
  });

  it("logs the failure with the request secrets redacted", async () => {
    const writes: Array<{ message: string; meta?: unknown }> = [];
    const sink: LogSink = { write: (_level, message, meta) => writes.push({ message, meta }) };
    const logger = new SinkLogger({ level: "debug", sink });

    const registry = new IpcRegistry();
    registry.handle("project:create", () => {
      throw new Error("falha");
    });
    const ipcMain = fakeIpcMain();
    bindIpcMain(registry, ipcMain, logger);

    const listener = ipcMain.listeners.get("project:create");
    await expect(
      listener?.({}, { name: "Banco", password: "s3cr3t" }),
    ).rejects.toBeInstanceOf(IpcHandlerError);

    expect(writes).toHaveLength(1);
    const meta = writes[0]?.meta as { channel: string; request: { password: string } };
    expect(meta.channel).toBe("project:create");
    expect(meta.request.password).toBe("[REDACTED]");
  });
});
