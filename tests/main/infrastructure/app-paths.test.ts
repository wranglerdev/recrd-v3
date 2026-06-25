import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAppPaths, ensureAppDirectories } from "@main/infrastructure/paths/app-paths";

describe("createAppPaths", () => {
  it("derives the userData layout described in PRD §4", () => {
    const paths = createAppPaths("/data/recrd");

    expect(paths.userData).toBe("/data/recrd");
    expect(paths.database).toBe(join("/data/recrd", "database.sqlite"));
    expect(paths.settings).toBe(join("/data/recrd", "settings.json"));
    expect(paths.logsDir).toBe(join("/data/recrd", "logs"));
    expect(paths.appLog).toBe(join("/data/recrd", "logs", "app.log"));
    expect(paths.executionsDir).toBe(join("/data/recrd", "logs", "executions"));
    expect(paths.exportsDir).toBe(join("/data/recrd", "exports"));
    expect(paths.cacheDir).toBe(join("/data/recrd", "cache"));
  });
});

describe("ensureAppDirectories", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "recrd-paths-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("creates the data directories (but not the files)", () => {
    const paths = createAppPaths(join(root, "userData"));
    ensureAppDirectories(paths);

    for (const dir of [paths.logsDir, paths.executionsDir, paths.exportsDir, paths.cacheDir]) {
      expect(statSync(dir).isDirectory()).toBe(true);
    }
  });

  it("is idempotent", () => {
    const paths = createAppPaths(join(root, "userData"));
    ensureAppDirectories(paths);
    expect(() => ensureAppDirectories(paths)).not.toThrow();
  });
});
