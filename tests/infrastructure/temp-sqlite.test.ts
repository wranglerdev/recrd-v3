import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createTempDatabase, withTempDatabase } from "../helpers/temp-sqlite";

describe("createTempDatabase", () => {
  it("provides a working on-disk database and removes it on cleanup", () => {
    const { db, path, cleanup } = createTempDatabase();

    db.exec("CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT)");
    db.prepare("INSERT INTO t (name) VALUES (?)").run("ada");
    const row = db.prepare("SELECT name FROM t WHERE id = 1").get() as { name: string };

    expect(row.name).toBe("ada");
    expect(existsSync(path)).toBe(true);

    cleanup();
    expect(existsSync(path)).toBe(false);
  });

  it("supports in-memory databases", () => {
    const { db, path, cleanup } = createTempDatabase({ memory: true });
    expect(path).toBe(":memory:");
    db.exec("CREATE TABLE t (x INTEGER)");
    db.prepare("INSERT INTO t VALUES (1)").run();
    expect(db.prepare("SELECT count(*) AS c FROM t").get()).toEqual({ c: 1 });
    cleanup();
  });

  it("enables foreign-key enforcement on disk databases", () => {
    const { db, cleanup } = createTempDatabase();
    expect(db.pragma("foreign_keys", { simple: true })).toBe(1);
    cleanup();
  });
});

describe("withTempDatabase", () => {
  it("cleans up after the callback resolves", async () => {
    let capturedPath = "";
    await withTempDatabase((database) => {
      capturedPath = database.path;
      database.db.exec("CREATE TABLE t (x)");
    });
    expect(existsSync(capturedPath)).toBe(false);
  });

  it("cleans up even when the callback throws", async () => {
    let capturedPath = "";
    await expect(
      withTempDatabase((database) => {
        capturedPath = database.path;
        throw new Error("boom");
      }),
    ).rejects.toThrowError(/boom/);
    expect(existsSync(capturedPath)).toBe(false);
  });
});
