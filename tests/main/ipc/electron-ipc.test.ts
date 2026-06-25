import { describe, expect, it } from "vitest";
import { bindIpcMain, type IpcMainLike } from "@main/ipc/electron-ipc";
import { IpcRegistry } from "@main/ipc/typed-ipc";

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
});
