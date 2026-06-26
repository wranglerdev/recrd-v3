import type { VersionInfo } from "../version-info.js";
import { defineChannelNames, type Invoke } from "./core.js";

// `app:*` feature contract — process/app metadata (PRD §3, §30). The template
// every other feature follows: a DTO block, a channel map, an `as const` name
// list, an API interface and a factory that maps API methods to channels via
// `invoke`.

/** Wire DTO returned by `app:getInfo`. */
export type AppInfo = {
  readonly name: string;
  readonly version: string;
  readonly platform: string;
};

export type { VersionInfo };

/** Channels owned by the app feature. */
export type AppChannels = {
  "app:getInfo": { request: void; response: AppInfo };
  "app:getVersionInfo": { request: void; response: VersionInfo };
};

export const APP_CHANNELS = defineChannelNames<AppChannels, ["app:getInfo", "app:getVersionInfo"]>([
  "app:getInfo",
  "app:getVersionInfo",
]);

/** The slice of the renderer API served by the app feature. */
export interface AppApi {
  getAppInfo(): Promise<AppInfo>;
  /** Reproducible-build metadata for the "Sobre" screen (PRD §30). */
  getVersionInfo(): Promise<VersionInfo>;
}

/** Builds the app API slice from the (full-map) invoker. Pure and testable. */
export function createAppApi(invoke: Invoke<AppChannels>): AppApi {
  return {
    getAppInfo: () => invoke("app:getInfo", undefined),
    getVersionInfo: () => invoke("app:getVersionInfo", undefined),
  };
}
