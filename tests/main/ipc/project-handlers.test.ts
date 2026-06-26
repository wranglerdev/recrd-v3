import { describe, expect, it, vi } from "vitest";
import { registerProjectHandlers } from "@main/ipc/handlers/project-handlers";
import { IpcRegistry } from "@main/ipc/typed-ipc";
import type { ProjectUseCases } from "@application/project/project-service";

function fakeProjectUseCases(): ProjectUseCases {
  return {
    create: vi.fn((input) => ({ id: "p1", name: input.name })),
    list: vi.fn(() => [{ id: "p1" }]),
    open: vi.fn((id) => ({ id })),
    rename: vi.fn((id, name) => ({ id, name })),
    updateDetails: vi.fn((id, input) => ({ id, ...input })),
    remove: vi.fn(),
  } as unknown as ProjectUseCases;
}

describe("registerProjectHandlers", () => {
  it("maps each project channel to the matching use case method", async () => {
    const useCases = fakeProjectUseCases();
    const registry = new IpcRegistry();
    registerProjectHandlers(registry, useCases);

    await registry.dispatch("project:create", { name: "Banco" });
    expect(useCases.create).toHaveBeenCalledWith({ name: "Banco" });

    await registry.dispatch("project:list", undefined);
    expect(useCases.list).toHaveBeenCalled();

    await registry.dispatch("project:open", { id: "p1" });
    expect(useCases.open).toHaveBeenCalledWith("p1");

    await registry.dispatch("project:rename", { id: "p1", name: "Novo" });
    expect(useCases.rename).toHaveBeenCalledWith("p1", "Novo");

    await registry.dispatch("project:updateDetails", { id: "p1", description: "d" });
    expect(useCases.updateDetails).toHaveBeenCalledWith("p1", { description: "d" });

    await registry.dispatch("project:remove", { id: "p1" });
    expect(useCases.remove).toHaveBeenCalledWith("p1");
  });
});
