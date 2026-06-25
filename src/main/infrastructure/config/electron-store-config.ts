import ElectronStore from "electron-store";
import type { AppPaths } from "../paths/app-paths.js";
import { DEFAULT_SETTINGS, type AppSettings, type ConfigStore } from "./config-store.js";

// electron-store adapter persisting settings.json under userData (PRD §4).
// Imported only from the main-process composition root; the app depends on the
// `ConfigStore` interface, which `InMemoryConfigStore` also implements for tests.
export class ElectronStoreConfig implements ConfigStore<AppSettings> {
  private readonly store: ElectronStore<AppSettings>;

  constructor(paths: AppPaths) {
    this.store = new ElectronStore<AppSettings>({
      cwd: paths.userData,
      name: "settings",
      defaults: DEFAULT_SETTINGS,
    });
  }

  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.store.get(key);
  }

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.store.set(key, value);
  }

  all(): AppSettings {
    return this.store.store;
  }
}
