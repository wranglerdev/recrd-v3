import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";

// Temporary SQLite database per integration test (PRD §23). Defaults to an
// on-disk file (closest to production via better-sqlite3); pass { memory: true }
// for an in-memory database. Always call cleanup() — or use withTempDatabase —
// to close the connection and remove the temp directory.

export interface TempDatabase {
  readonly db: Database.Database;
  readonly path: string;
  cleanup(): void;
}

export function createTempDatabase(options: { memory?: boolean } = {}): TempDatabase {
  if (options.memory === true) {
    const db = new Database(":memory:");
    return {
      db,
      path: ":memory:",
      cleanup: () => db.close(),
    };
  }

  const dir = mkdtempSync(join(tmpdir(), "recrd-sqlite-"));
  const path = join(dir, "test.sqlite");
  const db = new Database(path);
  // Match the runtime pragmas used by the app for realistic integration tests.
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return {
    db,
    path,
    cleanup: () => {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

/**
 * Runs `fn` with a fresh temp database and guarantees cleanup afterwards, even
 * if `fn` throws.
 */
export async function withTempDatabase<T>(
  fn: (database: TempDatabase) => T | Promise<T>,
  options: { memory?: boolean } = {},
): Promise<T> {
  const database = createTempDatabase(options);
  try {
    return await fn(database);
  } finally {
    database.cleanup();
  }
}
