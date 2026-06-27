import type { ElectronApplication } from "@playwright/test";

// SQLite assertion helper for E2E (electron-bzv.4). The Playwright runner is a
// plain Node process whose better-sqlite3 binary is built for Electron's ABI, so
// it cannot open the DB directly. Instead we run the query inside the Electron
// main process via app.evaluate, opening a second read-only connection to the
// app's database.sqlite (WAL lets it read the writer's committed rows). Used to
// assert persisted rows (projects, masses, executions, …) after a flow.

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
  return app.evaluate(async (_electron, { dbPath, sql, params }): Promise<Row[]> => {
    const { default: Database } = await import("better-sqlite3");
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
