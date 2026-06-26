import { describe, expect, it, vi } from "vitest";
import { registerRobotHandlers } from "@main/ipc/handlers/robot-handlers";
import { IpcRegistry } from "@main/ipc/typed-ipc";
import type { RobotProjectUseCases } from "@application/robot/robot-project-service";

function fakeUseCases(): RobotProjectUseCases {
  return {
    scaffold: vi.fn((input) => ({ created: ["/repo/tests"], robotPath: input.root })),
    linkExisting: vi.fn((input) => ({ ok: true as const, robotPath: input.root })),
  };
}

describe("registerRobotHandlers (PRD §14)", () => {
  it("maps robot:scaffold to the use case", async () => {
    const useCases = fakeUseCases();
    const registry = new IpcRegistry();
    registerRobotHandlers(registry, useCases);

    await expect(
      registry.dispatch("robot:scaffold", { projectId: "p1", root: "/repo" }),
    ).resolves.toEqual({ created: ["/repo/tests"], robotPath: "/repo" });
    expect(useCases.scaffold).toHaveBeenCalledWith({ projectId: "p1", root: "/repo" });
  });

  it("maps robot:linkExisting to the use case", async () => {
    const useCases = fakeUseCases();
    const registry = new IpcRegistry();
    registerRobotHandlers(registry, useCases);

    await expect(
      registry.dispatch("robot:linkExisting", { projectId: "p1", root: "/repo" }),
    ).resolves.toEqual({ ok: true, robotPath: "/repo" });
    expect(useCases.linkExisting).toHaveBeenCalledWith({ projectId: "p1", root: "/repo" });
  });
});
