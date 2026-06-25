import { describe, expect, it } from "vitest";
import {
  executionLogFileName,
  recrdJsonFileName,
  robotFileName,
  serializeManualScript,
  slugifyExportName,
} from "@domain/export/export-format";
import type { ManualScript } from "@domain/scripts/script-action";

describe("slugifyExportName", () => {
  it("lowercases and hyphenates", () => {
    expect(slugifyExportName("Login Banco XYZ")).toBe("login-banco-xyz");
    expect(slugifyExportName("  Olá, Mundo!  ")).toBe("ol-mundo");
  });

  it("falls back to 'export' for empty slugs", () => {
    expect(slugifyExportName("!!!")).toBe("export");
  });
});

describe("file names (PRD §17)", () => {
  it("builds recrd/robot/log names", () => {
    expect(recrdJsonFileName("Login")).toBe("login.recrd.json");
    expect(robotFileName("Login")).toBe("login.robot");
    expect(executionLogFileName(new Date("2026-06-20T10:00:00Z"))).toBe("execution-2026-06-20.log");
  });
});

describe("serializeManualScript", () => {
  it("pretty-prints with a trailing newline", () => {
    const script: ManualScript = { name: "T", actions: [{ type: "click", selector: "#x" }] };
    const json = serializeManualScript(script);
    expect(json.endsWith("\n")).toBe(true);
    expect(JSON.parse(json)).toEqual(script);
  });
});
