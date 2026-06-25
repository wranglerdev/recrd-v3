import { eq, type InferInsertModel, type InferSelectModel } from "drizzle-orm";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import type { AppDatabase } from "./connection.js";

// Generic typed Repository (PRD §6, §31) over any schema table with a text `id`.
// Concrete per-entity repositories are thin instances (see repositories.ts).

type TableWithId = SQLiteTable & { id: SQLiteColumn };

export class CrudRepository<T extends TableWithId> {
  constructor(
    private readonly db: AppDatabase,
    private readonly table: T,
  ) {}

  /** Inserts a row and returns it. */
  create(values: InferInsertModel<T>): InferSelectModel<T> {
    this.db.insert(this.table).values(values).run();
    // The `id` column is required on every table (TableWithId constraint); the
    // row necessarily exists immediately after a successful insert.
    return this.findById((values as { id: string }).id) as InferSelectModel<T>;
  }

  /** Returns the row with the given id, or undefined. */
  findById(id: string): InferSelectModel<T> | undefined {
    return this.db
      .select()
      .from(this.table as SQLiteTable)
      .where(eq(this.table.id, id))
      .get() as InferSelectModel<T> | undefined;
  }

  /** Returns all rows. */
  list(): InferSelectModel<T>[] {
    return this.db
      .select()
      .from(this.table as SQLiteTable)
      .all() as InferSelectModel<T>[];
  }

  /** Applies a partial update; returns the updated row, or undefined if absent. */
  update(id: string, patch: Partial<InferInsertModel<T>>): InferSelectModel<T> | undefined {
    this.db.update(this.table).set(patch).where(eq(this.table.id, id)).run();
    return this.findById(id);
  }

  /** Deletes a row; returns true when a row was removed. */
  remove(id: string): boolean {
    const result = this.db.delete(this.table).where(eq(this.table.id, id)).run();
    return result.changes > 0;
  }
}
