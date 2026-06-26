import { describe, expect, it, vi } from "vitest";
import {
  createExportUseCases,
  exportCompiledRobot,
  exportExecutionLog,
  exportManualScriptJson,
  type ExportEnvironment,
} from "../../src/application/export/export-service";
import type { AuditSink } from "../../src/application/audit/audit-service";
import type { UserContext } from "../../src/domain/auth/user-context";
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

describe("createExportUseCases (PRD §17)", () => {
  const userContext: UserContext = {
    username: "ana",
    displayName: "Ana",
    domain: "CORP",
    sid: "S-1-5-21",
  };
  const clock = () => new Date("2026-06-26T12:00:00.000Z");

  function setup(overrides?: {
    manualScript?: ManualScript;
    executionLog?: { log: string; startedAt: Date };
    audit?: AuditSink;
  }) {
    const env = fakeEnv();
    const audit = overrides?.audit ?? { record: vi.fn() };
    const useCases = createExportUseCases({
      manualScript: () => overrides?.manualScript,
      executionLog: () => overrides?.executionLog,
      env,
      userContext,
      clock,
      audit,
    });
    return { env, audit, useCases };
  }

  it("exports a case's manual script as JSON and audits it", async () => {
    const { env, audit, useCases } = setup({ manualScript: script });
    const path = await useCases.exportJson("case-1");

    expect(path).toBe("/data/exports/login-xyz.recrd.json");
    expect(JSON.parse(env.written.get(path) ?? "")).toEqual(script);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "export",
        user: "ana",
        details: { kind: "json", caseId: "case-1", path },
      }),
    );
  });

  it("compiles and exports a case's Robot file and audits it", async () => {
    const { env, audit, useCases } = setup({ manualScript: script });
    const path = await useCases.exportRobot("case-1");

    expect(path).toBe("/data/exports/login-xyz.robot");
    expect(env.written.get(path)).toContain("Library    Browser");
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ details: { kind: "robot", caseId: "case-1", path } }),
    );
  });

  it("exports a recorded execution's log and audits it", async () => {
    const { env, audit, useCases } = setup({
      executionLog: { log: "10:35 Click login", startedAt: new Date("2026-06-20T00:00:00Z") },
    });
    const path = await useCases.exportLog("exec-1");

    expect(path).toBe("/data/exports/execution-2026-06-20.log");
    expect(env.written.get(path)).toBe("10:35 Click login");
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ details: { kind: "log", executionId: "exec-1", path } }),
    );
  });

  it("throws when the case has no manual script to export", async () => {
    const { useCases } = setup();
    await expect(useCases.exportJson("missing")).rejects.toThrow("Caso sem script");
    await expect(useCases.exportRobot("missing")).rejects.toThrow("Caso sem script");
  });

  it("throws when the execution is not found", async () => {
    const { useCases } = setup();
    await expect(useCases.exportLog("missing")).rejects.toThrow("Execução não encontrada");
  });

  it("works without an audit sink", async () => {
    const env = fakeEnv();
    const useCases = createExportUseCases({
      manualScript: () => script,
      executionLog: () => ({ log: "x", startedAt: new Date("2026-06-20T00:00:00Z") }),
      env,
      userContext,
      clock,
    });

    await expect(useCases.exportJson("c")).resolves.toBe("/data/exports/login-xyz.recrd.json");
    await expect(useCases.exportLog("e")).resolves.toBe("/data/exports/execution-2026-06-20.log");
  });
});
