import { describe, expect, it, vi } from "vitest";
import {
  exportCompiledRobot,
  exportExecutionLog,
  exportManualScriptJson,
  type ExportEnvironment,
} from "../../src/application/export/export-service";
import type { ManualScript } from "../../src/domain/scripts/script-action";

function fakeEnv(): ExportEnvironment & { written: Map<string, string> } {
  const written = new Map<string, string>();
  return {
    exportsDir: "/data/exports",
    written,
    join: (dir, file) => `${dir}/${file}`,
    writeFile: vi.fn((path: string, content: string) => {
      written.set(path, content);
      return Promise.resolve();
    }),
  };
}

const script: ManualScript = {
  name: "Login XYZ",
  actions: [
    { type: "navigate", url: "https://example.com" },
    { type: "input", selector: "#u", value: "{{usuario}}" },
  ],
};

describe("export use cases (PRD §17)", () => {
  it("exports the raw manual script as JSON", async () => {
    const env = fakeEnv();
    const path = await exportManualScriptJson(script, env);

    expect(path).toBe("/data/exports/login-xyz.recrd.json");
    expect(JSON.parse(env.written.get(path) ?? "")).toEqual(script);
  });

  it("exports the compiled Robot file", async () => {
    const env = fakeEnv();
    const path = await exportCompiledRobot(script, env);

    expect(path).toBe("/data/exports/login-xyz.robot");
    expect(env.written.get(path)).toContain("Library    Browser");
    expect(env.written.get(path)).toContain("Fill Text    #u    ${usuario}");
  });

  it("exports an execution log with a dated file name", async () => {
    const env = fakeEnv();
    const path = await exportExecutionLog(
      "10:35 Click login",
      new Date("2026-06-20T00:00:00Z"),
      env,
    );

    expect(path).toBe("/data/exports/execution-2026-06-20.log");
    expect(env.written.get(path)).toBe("10:35 Click login");
  });
});
