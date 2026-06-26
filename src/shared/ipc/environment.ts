import { defineChannelNames, type Invoke } from "./core.js";

// `env:*` feature contract — Python/Robot/Playwright environment verification
// (PRD §14). The renderer asks the main process to probe the toolchain (against
// the active project's Robot path) and gets back a status report plus the
// install plan needed to make it ready. Wire types are plain and serialisable.

export interface EnvironmentReportDto {
  readonly python: { readonly installed: boolean; readonly version: string | null };
  readonly robotFramework: boolean;
  readonly playwrightBrowser: boolean;
  readonly venvPresent: boolean;
  readonly ready: boolean;
}

export interface CheckEnvironmentRequest {
  /** The project's Robot path, used to detect a local `.venv`; null when unset. */
  readonly root: string | null;
}

export interface EnvironmentStatusDto {
  readonly report: EnvironmentReportDto;
  /** Commands to run to bring the environment up to scratch ("Instalar ambiente"). */
  readonly plan: readonly string[];
}

export interface StartInstallRequest {
  /** The project's Robot path; the install runs (and creates `.venv`) here. */
  readonly root: string;
}

/** Whether the install started; if not, why (already running, or already ready). */
export type StartInstallResult =
  | { readonly started: true }
  | { readonly started: false; readonly reason: string };

export type EnvironmentChannels = {
  "env:check": { request: CheckEnvironmentRequest; response: EnvironmentStatusDto };
  "env:install": { request: StartInstallRequest; response: StartInstallResult };
};

export const ENVIRONMENT_CHANNELS = defineChannelNames<
  EnvironmentChannels,
  ["env:check", "env:install"]
>(["env:check", "env:install"]);

/** The slice of the renderer API served by the environment feature. */
export interface EnvironmentApi {
  checkEnvironment(request: CheckEnvironmentRequest): Promise<EnvironmentStatusDto>;
  /** Starts the install plan; progress streams over the `env:install:*` events. */
  startEnvironmentInstall(request: StartInstallRequest): Promise<StartInstallResult>;
}

export function createEnvironmentApi(invoke: Invoke<EnvironmentChannels>): EnvironmentApi {
  return {
    checkEnvironment: (request) => invoke("env:check", request),
    startEnvironmentInstall: (request) => invoke("env:install", request),
  };
}
