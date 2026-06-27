import { dirname, join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { _electron as electron, type ElectronApplication, type Page } from "@playwright/test";
import { createAppPaths, type AppPaths } from "@main/infrastructure/paths/app-paths";

// Centralised E2E app launcher (electron-bzv.4). Every flow suite launches the
// real Electron app against a throwaway userData dir so settings/db/exports never
// bleed between tests, and tears it down afterwards. Test seams are activated by
// passing RECRD_E2E_* env vars (electron-bzv.1, electron-bzv.3).

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const MAIN_ENTRY = join(repoRoot, "dist", "main", "main.js");

export interface LaunchOptions {
  /** Extra env vars (e.g. the RECRD_E2E_* seam toggles) merged over process.env. */
  readonly env?: Readonly<Record<string, string>>;
}

export interface LaunchedApp {
  readonly app: ElectronApplication;
  readonly window: Page;
  /** The isolated userData root for this launch. */
  readonly userDataDir: string;
  /** Well-known paths (database, exports, executions, …) under {@link userDataDir}. */
  readonly paths: AppPaths;
  /** Closes the app and removes the isolated userData dir. */
  close(): Promise<void>;
}

/** Launches the app with an isolated userData dir and returns app + first window. */
export async function launchApp(options: LaunchOptions = {}): Promise<LaunchedApp> {
  const userDataDir = mkdtempSync(join(tmpdir(), "recrd-e2e-"));
  const app = await electron.launch({
    args: [MAIN_ENTRY, `--user-data-dir=${userDataDir}`],
    env: { ...process.env, ...options.env } as Record<string, string>,
  });
  const window = await app.firstWindow();
  await window.waitForLoadState("domcontentloaded");

  return {
    app,
    window,
    userDataDir,
    paths: createAppPaths(userDataDir),
    async close() {
      await app.close();
      rmSync(userDataDir, { recursive: true, force: true });
    },
  };
}
