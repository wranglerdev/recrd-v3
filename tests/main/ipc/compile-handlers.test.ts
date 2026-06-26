import { describe, expect, it, vi } from "vitest";
import { registerCompileHandlers } from "@main/ipc/handlers/compile-handlers";
import { IpcRegistry } from "@main/ipc/typed-ipc";
import type { CompileUseCases } from "@application/compile/compile-service";

describe("registerCompileHandlers", () => {
  it("maps compile:run to compileAndPersist", async () => {
    const useCases: CompileUseCases = {
      compileAndPersist: vi.fn(() => ({
        ok: true as const,
        scriptId: "s1",
        robot: "*** Test Cases ***",
        robotFile: "/repo/tests/t.robot",
        warnings: [],
      })),
    };
    const registry = new IpcRegistry();
    registerCompileHandlers(registry, useCases);

    const request = {
      caseId: "c1",
      projectId: "p1",
      script: { name: "T", actions: [{ type: "navigate", url: "https://x.com" }] },
    } as const;
    const response = await registry.dispatch("compile:run", request);

    expect(useCases.compileAndPersist).toHaveBeenCalledWith(request);
    expect(response).toMatchObject({ ok: true, scriptId: "s1" });
  });
});
