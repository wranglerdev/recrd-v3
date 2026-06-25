import { describe, expect, it, vi } from "vitest";
import { IpcRegistry } from "@main/ipc/typed-ipc";

describe("IpcRegistry", () => {
  it("dispatches to the registered handler with the request", async () => {
    const registry = new IpcRegistry();
    registry.handle("app:getInfo", () => ({ name: "recrd", version: "0.1.0", platform: "linux" }));

    await expect(registry.dispatch("app:getInfo", undefined)).resolves.toEqual({
      name: "recrd",
      version: "0.1.0",
      platform: "linux",
    });
  });

  it("awaits async handlers", async () => {
    const registry = new IpcRegistry();
    registry.handle("app:getInfo", () =>
      Promise.resolve({ name: "recrd", version: "9.9.9", platform: "win32" }),
    );

    await expect(registry.dispatch("app:getInfo", undefined)).resolves.toMatchObject({
      version: "9.9.9",
    });
  });

  it("fails fast when dispatching an unregistered channel", async () => {
    const registry = new IpcRegistry();

    await expect(registry.dispatch("app:getInfo", undefined)).rejects.toThrowError(
      /no ipc handler.*app:getInfo/i,
    );
  });

  it("fails fast on duplicate handler registration", () => {
    const registry = new IpcRegistry();
    registry.handle("app:getInfo", () => ({ name: "a", version: "1", platform: "linux" }));

    expect(() =>
      registry.handle("app:getInfo", () => ({ name: "b", version: "2", platform: "linux" })),
    ).toThrowError(/already registered.*app:getInfo/i);
  });

  it("propagates handler errors to the caller", async () => {
    const registry = new IpcRegistry();
    registry.handle("app:getInfo", () => {
      throw new Error("boom");
    });

    await expect(registry.dispatch("app:getInfo", undefined)).rejects.toThrowError(/boom/);
  });

  it("reports registered channels", () => {
    const registry = new IpcRegistry();
    expect(registry.has("app:getInfo")).toBe(false);
    registry.handle("app:getInfo", vi.fn());
    expect(registry.has("app:getInfo")).toBe(true);
    expect(registry.channels()).toEqual(["app:getInfo"]);
  });
});
