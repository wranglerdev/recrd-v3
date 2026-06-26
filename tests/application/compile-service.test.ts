import { describe, expect, it, vi } from "vitest";
import {
  createCompileUseCases,
  robotFileName,
  type CompiledScript,
  type CompiledScriptRepository,
  type RobotFileWriter,
} from "../../src/application/compile/compile-service";
import type { ProjectUseCases } from "../../src/application/project/project-service";
import type { ManualScript } from "../../src/domain/scripts/script-action";

const USER = { username: "jdoe", displayName: "J", domain: "CORP", sid: "S-1" };

function fakeScripts(): CompiledScriptRepository & { stored: CompiledScript[] } {
  const stored: CompiledScript[] = [];
  return {
    stored,
    create(script) {
      stored.push(script);
      return script;
    },
  };
}

function fakeWriter(): RobotFileWriter & { calls: Array<[string, string, string]> } {
  const calls: Array<[string, string, string]> = [];
  return {
    calls,
    write(robotPath, fileName, content) {
      calls.push([robotPath, fileName, content]);
      return `${robotPath}/tests/${fileName}`;
    },
  };
}

function fakeProjects(robotPath: string | null): Pick<ProjectUseCases, "open"> {
  return { open: vi.fn(() => ({ id: "p1", robotPath })) } as unknown as Pick<
    ProjectUseCases,
    "open"
  >;
}

const VALID_SCRIPT: ManualScript = {
  name: "Login Banco",
  actions: [{ type: "navigate", url: "https://example.com" }],
};

function makeUseCases(robotPath: string | null) {
  const scripts = fakeScripts();
  const robotFiles = fakeWriter();
  const projects = fakeProjects(robotPath);
  const useCases = createCompileUseCases({
    scripts,
    robotFiles,
    projects,
    userContext: USER,
    newId: () => "script-1",
    clock: () => new Date("2026-06-26T09:00:00.000Z"),
  });
  return { scripts, robotFiles, projects, useCases };
}

describe("robotFileName", () => {
  it("slugs a name into a safe .robot file name", () => {
    expect(robotFileName("Login Banco XYZ")).toBe("login_banco_xyz.robot");
    expect(robotFileName("Validação de Saldo!")).toBe("validacao_de_saldo.robot");
    expect(robotFileName("   ")).toBe("test.robot");
  });
});

describe("createCompileUseCases.compileAndPersist (PRD §13, §14)", () => {
  it("compiles, persists the compiled script and writes the .robot file", () => {
    const { scripts, robotFiles, useCases } = makeUseCases("/repo");

    const result = useCases.compileAndPersist({
      caseId: "c1",
      projectId: "p1",
      script: VALID_SCRIPT,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.scriptId).toBe("script-1");
      expect(result.robotFile).toBe("/repo/tests/login_banco.robot");
      expect(result.robot).toContain("*** Test Cases ***");
    }
    expect(scripts.stored).toHaveLength(1);
    expect(scripts.stored[0]).toMatchObject({
      id: "script-1",
      caseId: "c1",
      kind: "compiled",
      createdBy: "jdoe",
    });
    expect(robotFiles.calls).toHaveLength(1);
    expect(robotFiles.calls[0]?.[1]).toBe("login_banco.robot");
  });

  it("returns the failure result without persisting or writing on invalid script", () => {
    const { scripts, robotFiles, useCases } = makeUseCases("/repo");

    const result = useCases.compileAndPersist({
      caseId: "c1",
      projectId: "p1",
      script: { name: "Empty", actions: [] },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe("script");
    }
    expect(scripts.stored).toHaveLength(0);
    expect(robotFiles.calls).toHaveLength(0);
  });

  it("throws when the project has no Robot repository configured", () => {
    const { scripts, robotFiles, useCases } = makeUseCases(null);

    expect(() =>
      useCases.compileAndPersist({ caseId: "c1", projectId: "p1", script: VALID_SCRIPT }),
    ).toThrow(/sem repositório robot/i);
    // Nothing persisted or written when the precondition fails.
    expect(scripts.stored).toHaveLength(0);
    expect(robotFiles.calls).toHaveLength(0);
  });
});
