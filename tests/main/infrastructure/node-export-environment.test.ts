import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { exportManualScriptJson } from "@application/export/export-service";
import { createExportEnvironment } from "@main/infrastructure/fs/node-export-environment";
import { createAppPaths, ensureAppDirectories } from "@main/infrastructure/paths/app-paths";
import type { ManualScript } from "@domain/scripts/script-action";

describe("createExportEnvironment", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "recrd-export-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("writes an exported file into the userData exports directory", async () => {
    const paths = createAppPaths(join(root, "userData"));
    ensureAppDirectories(paths);
    const env = createExportEnvironment(paths);

    const script: ManualScript = { name: "Login", actions: [{ type: "click", selector: "#x" }] };
    const path = await exportManualScriptJson(script, env);

    expect(path).toBe(join(paths.exportsDir, "login.recrd.json"));
    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual(script);
  });
});
