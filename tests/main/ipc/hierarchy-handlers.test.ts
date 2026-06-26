import { describe, expect, it, vi } from "vitest";
import { registerHierarchyHandlers } from "@main/ipc/handlers/hierarchy-handlers";
import { IpcRegistry } from "@main/ipc/typed-ipc";
import type {
  CaseUseCases,
  PlanUseCases,
  SuiteUseCases,
} from "@application/hierarchy/hierarchy-service";

function fakeHierarchy() {
  const plans = {
    create: vi.fn((input) => ({ id: "pl1", ...input })),
    listByProject: vi.fn(() => []),
    open: vi.fn((id) => ({ id })),
    rename: vi.fn((id, name) => ({ id, name })),
    updateDescription: vi.fn((id, description) => ({ id, description })),
    remove: vi.fn(),
  } as unknown as PlanUseCases;
  const suites = {
    create: vi.fn((input) => ({ id: "s1", ...input })),
    listByPlan: vi.fn(() => []),
    open: vi.fn((id) => ({ id })),
    rename: vi.fn((id, name) => ({ id, name })),
    remove: vi.fn(),
  } as unknown as SuiteUseCases;
  const cases = {
    create: vi.fn((input) => ({ id: "c1", ...input })),
    listBySuite: vi.fn(() => []),
    open: vi.fn((id) => ({ id })),
    rename: vi.fn((id, name) => ({ id, name })),
    updateDescription: vi.fn((id, description) => ({ id, description })),
    setStatus: vi.fn((id, status) => ({ id, status })),
    remove: vi.fn(),
  } as unknown as CaseUseCases;
  return { plans, suites, cases };
}

describe("registerHierarchyHandlers", () => {
  it("maps plan channels to the plan use cases", async () => {
    const useCases = fakeHierarchy();
    const registry = new IpcRegistry();
    registerHierarchyHandlers(registry, useCases);

    await registry.dispatch("plan:create", { projectId: "p1", name: "Plano" });
    expect(useCases.plans.create).toHaveBeenCalledWith({ projectId: "p1", name: "Plano" });

    await registry.dispatch("plan:listByProject", { id: "p1" });
    expect(useCases.plans.listByProject).toHaveBeenCalledWith("p1");

    await registry.dispatch("plan:updateDescription", { id: "pl1", description: "d" });
    expect(useCases.plans.updateDescription).toHaveBeenCalledWith("pl1", "d");

    await registry.dispatch("plan:remove", { id: "pl1" });
    expect(useCases.plans.remove).toHaveBeenCalledWith("pl1");
  });

  it("maps suite channels to the suite use cases", async () => {
    const useCases = fakeHierarchy();
    const registry = new IpcRegistry();
    registerHierarchyHandlers(registry, useCases);

    await registry.dispatch("suite:create", { planId: "pl1", name: "Suite" });
    expect(useCases.suites.create).toHaveBeenCalledWith({ planId: "pl1", name: "Suite" });

    await registry.dispatch("suite:listByPlan", { id: "pl1" });
    expect(useCases.suites.listByPlan).toHaveBeenCalledWith("pl1");

    await registry.dispatch("suite:rename", { id: "s1", name: "X" });
    expect(useCases.suites.rename).toHaveBeenCalledWith("s1", "X");
  });

  it("maps case channels to the case use cases", async () => {
    const useCases = fakeHierarchy();
    const registry = new IpcRegistry();
    registerHierarchyHandlers(registry, useCases);

    await registry.dispatch("case:create", { suiteId: "s1", name: "Caso" });
    expect(useCases.cases.create).toHaveBeenCalledWith({ suiteId: "s1", name: "Caso" });

    await registry.dispatch("case:setStatus", { id: "c1", status: "ready" });
    expect(useCases.cases.setStatus).toHaveBeenCalledWith("c1", "ready");

    await registry.dispatch("case:updateDescription", { id: "c1", description: "d" });
    expect(useCases.cases.updateDescription).toHaveBeenCalledWith("c1", "d");

    await registry.dispatch("case:remove", { id: "c1" });
    expect(useCases.cases.remove).toHaveBeenCalledWith("c1");
  });
});
