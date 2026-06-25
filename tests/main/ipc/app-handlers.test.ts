import { describe, expect, it } from "vitest";
import { registerAppHandlers } from "@main/ipc/handlers/app-handlers";
import { IpcRegistry } from "@main/ipc/typed-ipc";

describe("registerAppHandlers", () => {
  it("serves the provided app info on app:getInfo", async () => {
    const registry = new IpcRegistry();
    registerAppHandlers(registry, { name: "recrd", version: "1.2.3", platform: "win32" });

    await expect(registry.dispatch("app:getInfo", undefined)).resolves.toEqual({
      name: "recrd",
      version: "1.2.3",
      platform: "win32",
    });
  });
});
