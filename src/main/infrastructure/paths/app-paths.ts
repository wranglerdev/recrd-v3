import { mkdirSync } from "node:fs";
import { join } from "node:path";

// User data layout for a local-first install (PRD §4). The root is resolved by
// the caller (Electron's `app.getPath('userData')` in production), keeping this
// module pure and unit-testable on any platform.
export interface AppPaths {
  readonly userData: string;
  readonly database: string;
  readonly settings: string;
  readonly logsDir: string;
  readonly appLog: string;
  readonly executionsDir: string;
  readonly exportsDir: string;
  readonly cacheDir: string;
}

/** Derives every well-known path from the userData root. */
export function createAppPaths(userDataDir: string): AppPaths {
  const logsDir = join(userDataDir, "logs");
  return {
    userData: userDataDir,
    database: join(userDataDir, "database.sqlite"),
    settings: join(userDataDir, "settings.json"),
    logsDir,
    appLog: join(logsDir, "app.log"),
    executionsDir: join(logsDir, "executions"),
    exportsDir: join(userDataDir, "exports"),
    cacheDir: join(userDataDir, "cache"),
  };
}

/** Creates the data directories (idempotent). Files are created on demand. */
export function ensureAppDirectories(paths: AppPaths): void {
  for (const dir of [paths.logsDir, paths.executionsDir, paths.exportsDir, paths.cacheDir]) {
    mkdirSync(dir, { recursive: true });
  }
}
