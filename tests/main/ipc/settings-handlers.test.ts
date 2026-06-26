import { describe, expect, it } from "vitest";
import { registerSettingsHandlers } from "@main/ipc/handlers/settings-handlers";
import { IpcRegistry } from "@main/ipc/typed-ipc";
import {
  DEFAULT_SETTINGS,
  InMemoryConfigStore,
  type AppSettings,
} from "@main/infrastructure/config/config-store";
import type { SettingsPatch } from "@shared/ipc-contract";

function setup() {
  const config = new InMemoryConfigStore<AppSettings>(DEFAULT_SETTINGS);
  const registry = new IpcRegistry();
  registerSettingsHandlers(registry, config);
  return { config, registry };
}

describe("registerSettingsHandlers", () => {
  it("returns the full settings on settings:getAll", async () => {
    const { registry } = setup();
    await expect(registry.dispatch("settings:getAll", undefined)).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it("applies only the provided keys and returns the updated settings", async () => {
    const { config, registry } = setup();

    const updated = await registry.dispatch("settings:update", {
      toolPaths: { python: "/usr/bin/python3", robot: null },
    });

    expect(updated.toolPaths).toEqual({ python: "/usr/bin/python3", robot: null });
    // Untouched keys are preserved.
    expect(updated.recording).toEqual(DEFAULT_SETTINGS.recording);
    expect(config.get("toolPaths")).toEqual({ python: "/usr/bin/python3", robot: null });
  });

  it("ignores explicitly-undefined keys in the patch", async () => {
    const { config, registry } = setup();
    // An explicitly-undefined key must be skipped, not written.
    const patch = { toolPaths: undefined, recentProjects: ["p1"] } as unknown as SettingsPatch;
    await registry.dispatch("settings:update", patch);
    expect(config.get("recentProjects")).toEqual(["p1"]);
    expect(config.get("toolPaths")).toEqual(DEFAULT_SETTINGS.toolPaths);
  });
});
