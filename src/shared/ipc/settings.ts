import { defineChannelNames, type Invoke } from "./core.js";

// `settings:*` feature contract — persisted application settings (PRD §3, §4).
// Mirrors the AppSettings shape as plain serialisable data so the Settings screen
// reads and patches it without touching electron-store directly.

export interface WindowStateDto {
  readonly width: number;
  readonly height: number;
}

export interface ToolPathsDto {
  readonly python: string | null;
  readonly robot: string | null;
}

export interface RecordingPreferencesDto {
  readonly captureScreenshots: boolean;
  readonly defaultTimeoutMs: number;
}

export interface SettingsDto {
  readonly lastOpenedProjectId: string | null;
  readonly recentProjects: readonly string[];
  readonly window: WindowStateDto;
  readonly toolPaths: ToolPathsDto;
  readonly recording: RecordingPreferencesDto;
}

/** A partial patch; only the provided top-level keys are written. */
export type SettingsPatch = Partial<SettingsDto>;

export type SettingsChannels = {
  "settings:getAll": { request: void; response: SettingsDto };
  "settings:update": { request: SettingsPatch; response: SettingsDto };
};

export const SETTINGS_CHANNELS = defineChannelNames<
  SettingsChannels,
  ["settings:getAll", "settings:update"]
>(["settings:getAll", "settings:update"]);

/** The slice of the renderer API served by the settings feature. */
export interface SettingsApi {
  getSettings(): Promise<SettingsDto>;
  /** Persists the provided keys and returns the full updated settings. */
  updateSettings(patch: SettingsPatch): Promise<SettingsDto>;
}

export function createSettingsApi(invoke: Invoke<SettingsChannels>): SettingsApi {
  return {
    getSettings: () => invoke("settings:getAll", undefined),
    updateSettings: (patch) => invoke("settings:update", patch),
  };
}
