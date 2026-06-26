import type { AppSettings, ConfigStore } from "../../infrastructure/config/config-store.js";
import type { IpcRegistry } from "../typed-ipc.js";

// Registers the `settings:*` IPC handlers (PRD §3, §4). Thin transport adapter
// over the injected ConfigStore: reads the full settings and applies a partial
// patch key by key (only provided keys are written), returning the new state.
export function registerSettingsHandlers(
  registry: IpcRegistry,
  config: ConfigStore<AppSettings>,
): void {
  registry.handle("settings:getAll", () => config.all());
  registry.handle("settings:update", (patch) => {
    for (const key of Object.keys(patch) as (keyof AppSettings)[]) {
      const value = patch[key];
      if (value !== undefined) {
        config.set(key, value);
      }
    }
    return config.all();
  });
}
