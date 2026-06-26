import { describe, expect, it, vi } from "vitest";
import { registerScriptHandlers } from "@main/ipc/handlers/script-handlers";
import { IpcRegistry } from "@main/ipc/typed-ipc";
import type { ScriptUseCases } from "@application/scripts/script-service";
import type { ManualScript } from "@domain/scripts/script-action";

const script: ManualScript = { name: "Login", actions: [] };

function useCases(overrides?: Partial<ScriptUseCases>): ScriptUseCases {
  return {
    saveManual: vi.fn(),
    getManual: vi.fn().mockReturnValue(undefined),
    ...overrides,
  };
}

describe("registerScriptHandlers (PRD §6, §10)", () => {
  it("saves the manual script, returning nothing", async () => {
    const cases = useCases();
    const registry = new IpcRegistry();
    registerScriptHandlers(registry, cases);

    await expect(
      registry.dispatch("script:saveManual", { caseId: "c1", script }),
    ).resolves.toBeUndefined();
    expect(cases.saveManual).toHaveBeenCalledWith({ caseId: "c1", script });
  });

  it("returns the manual script when present", async () => {
    const cases = useCases({ getManual: vi.fn().mockReturnValue(script) });
    const registry = new IpcRegistry();
    registerScriptHandlers(registry, cases);

    await expect(registry.dispatch("script:getManual", { caseId: "c1" })).resolves.toEqual(script);
    expect(cases.getManual).toHaveBeenCalledWith("c1");
  });

  it("returns null when the case has no manual script", async () => {
    const cases = useCases();
    const registry = new IpcRegistry();
    registerScriptHandlers(registry, cases);

    await expect(registry.dispatch("script:getManual", { caseId: "c1" })).resolves.toBeNull();
  });
});
