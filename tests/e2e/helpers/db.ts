import type { ElectronApplication } from "@playwright/test";

// SQLite assertion helper for E2E (electron-bzv.4). The Playwright runner is a
// plain Node process whose better-sqlite3 binary is built for Electron's ABI, so
// it cannot open the DB directly. Instead we run the query inside the Electron
// main process via app.evaluate, opening a second read-only connection to the
// app's database.sqlite (WAL lets it read the writer's committed rows). Used to
// assert persisted rows (projects, masses, executions, …) after a flow.
//
// The bundled main process is ESM, so the evaluated callback runs in a context
// with no `require` and no dynamic-import callback. We reach better-sqlite3 via
// `process.getBuiltinModule("module").createRequire`, resolving from the app
// path (dist/main) so node resolution walks up to the repo's node_modules.

export interface DbQuery {
  /** Absolute path to the app's database.sqlite (from LaunchedApp.paths.database). */
  readonly dbPath: string;
  readonly sql: string;
  readonly params?: readonly (string | number | null)[];
}

/** Runs a read-only SQL query against the app's DB and returns the rows. */
export async function queryDb<Row = Record<string, unknown>>(
  app: ElectronApplication,
  query: DbQuery,
): Promise<Row[]> {
  return app.evaluate((electron, { dbPath, sql, params }): Row[] => {
    // The bundled main is ESM and the evaluate context has no dynamic-import
    // callback, so `await import("better-sqlite3")` throws. Reach the native
    // module synchronously via createRequire resolved from the app path (which
    // walks up to the repo's node_modules), exactly as the _probe test verifies.
    const getBuiltin = (process as unknown as { getBuiltinModule: (s: string) => unknown })
      .getBuiltinModule;
    const mod = getBuiltin("module") as { createRequire: (p: string) => (s: string) => unknown };
    const appPath = (electron.app as { getAppPath: () => string }).getAppPath();
    const require = mod.createRequire(appPath);
    const Database = require("better-sqlite3") as new (
      path: string,
      options: { readonly: boolean; fileMustExist: boolean },
    ) => {
      prepare(sql: string): { all(...params: readonly (string | number | null)[]): unknown[] };
      close(): void;
    };
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    try {
      return db.prepare(sql).all(...(params ?? [])) as Row[];
    } finally {
      db.close();
    }
  }, query);
}

/** Convenience: the number of rows a query returns. */
export async function countRows(app: ElectronApplication, query: DbQuery): Promise<number> {
  const rows = await queryDb(app, query);
  return rows.length;
}
