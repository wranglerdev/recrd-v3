import { describe, expect, it } from "vitest";
import { registerAppHandlers } from "@main/ipc/handlers/app-handlers";
import { IpcRegistry } from "@main/ipc/typed-ipc";

const VERSION = {
  version: "1.2.3",
  gitCommit: "abc1234",
  buildDate: "2026-06-26T00:00:00.000Z",
  target: "win-x64",
};

describe("registerAppHandlers", () => {
  it("serves the provided app info on app:getInfo", async () => {
    const registry = new IpcRegistry();
    registerAppHandlers(registry, { name: "recrd", version: "1.2.3", platform: "win32" }, VERSION);

    await expect(registry.dispatch("app:getInfo", undefined)).resolves.toEqual({
      name: "recrd",
      version: "1.2.3",
      platform: "win32",
    });
  });

  it("serves the build version metadata on app:getVersionInfo", async () => {
    const registry = new IpcRegistry();
    registerAppHandlers(registry, { name: "recrd", version: "1.2.3", platform: "win32" }, VERSION);

    await expect(registry.dispatch("app:getVersionInfo", undefined)).resolves.toEqual(VERSION);
  });
});
