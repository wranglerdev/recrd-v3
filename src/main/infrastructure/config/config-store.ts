// Application settings persisted to `settings.json` (PRD §3, §4). The store is
// abstracted behind `ConfigStore<T>` so the domain of "settings" is decoupled
// from electron-store, keeping it testable on Linux/dev.

export type WindowState = {
  readonly width: number;
  readonly height: number;
};

/** Filesystem paths to the external toolchain (PRD §14); null = use PATH. */
export type ToolPaths = {
  readonly python: string | null;
  readonly robot: string | null;
};

/** Recording/capture preferences for the automation screen (PRD §9, §11). */
export type RecordingPreferences = {
  readonly captureScreenshots: boolean;
  readonly defaultTimeoutMs: number;
};

// Declared as a type alias (not an interface) so it satisfies the
// `Record<string, unknown>` constraint on ConfigStore<T> / electron-store.
export type AppSettings = {
  /** Project reopened by the "Abrir Último Projeto" quick action (PRD §8). */
  readonly lastOpenedProjectId: string | null;
  /** Most-recently-opened project ids, newest first. */
  readonly recentProjects: readonly string[];
  /** Last main-window size, restored on launch. */
  readonly window: WindowState;
  /** Configurable python/robot executable paths (Settings screen). */
  readonly toolPaths: ToolPaths;
  /** Recording preferences edited in the Settings screen. */
  readonly recording: RecordingPreferences;
};

export const DEFAULT_SETTINGS: AppSettings = {
  lastOpenedProjectId: null,
  recentProjects: [],
  window: { width: 1280, height: 800 },
  toolPaths: { python: null, robot: null },
  recording: { captureScreenshots: true, defaultTimeoutMs: 5000 },
};

/** Minimal typed key/value access over a persisted settings object. */
export interface ConfigStore<T extends Record<string, unknown>> {
  get<K extends keyof T>(key: K): T[K];
  set<K extends keyof T>(key: K, value: T[K]): void;
  all(): T;
}

/**
 * In-memory store seeded from defaults. Used in tests and Linux development; the
 * Electron build swaps in the electron-store adapter with identical semantics.
 */
export class InMemoryConfigStore<T extends Record<string, unknown>> implements ConfigStore<T> {
  private readonly state: T;

  constructor(defaults: T) {
    this.state = { ...defaults };
  }

  get<K extends keyof T>(key: K): T[K] {
    return this.state[key];
  }

  set<K extends keyof T>(key: K, value: T[K]): void {
    this.state[key] = value;
  }

  all(): T {
    return { ...this.state };
  }
}
