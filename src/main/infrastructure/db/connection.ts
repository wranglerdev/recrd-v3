import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { runMigrations } from "./migrations.js";
import { schema } from "./schema.js";

// SQLite connection bootstrap in userData (PRD §4, §6). Opens better-sqlite3,
// enables foreign keys + WAL, applies migrations and wraps it with Drizzle.

export type AppDatabase = BetterSQLite3Database<typeof schema>;

export type DatabaseHandle = {
  readonly db: AppDatabase;
  close(): void;
};

export function createDatabase(path: string): DatabaseHandle {
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  runMigrations(sqlite);
  const db = drizzle(sqlite, { schema });
  return {
    db,
    close: () => sqlite.close(),
  };
}
