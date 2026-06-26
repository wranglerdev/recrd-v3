import { describe, expect, it, vi } from "vitest";
import { registerRunHandlers, type RobotRunController } from "@main/ipc/handlers/run-handlers";
import { IpcRegistry } from "@main/ipc/typed-ipc";
import type { ProjectUseCases } from "@application/project/project-service";

function fakeRunner(overrides: Partial<RobotRunController> = {}): RobotRunController {
  return {
    isRunning: () => false,
    start: vi.fn(),
    stop: vi.fn(),
    ...overrides,
  };
}

function projectsReturning(robotPath: string | null): Pick<ProjectUseCases, "open"> {
  return { open: vi.fn(() => ({ id: "p1", robotPath })) } as unknown as Pick<
    ProjectUseCases,
    "open"
  >;
}

describe("registerRunHandlers (PRD §15)", () => {
  it("starts the run and forwards stdout/exit over the event emitter", async () => {
    const emit = vi.fn();
    const start = vi.fn();
    const runner = fakeRunner({ start });
    const registry = new IpcRegistry();
    registerRunHandlers(registry, {
      runner,
      emitter: { emit },
      projects: projectsReturning("/repo"),
    });

    await expect(registry.dispatch("run:start", { projectId: "p1" })).resolves.toEqual({
      started: true,
    });
    expect(start).toHaveBeenCalledWith(
      { cwd: "/repo", testPath: "tests" },
      expect.objectContaining({ onLine: expect.any(Function), onExit: expect.any(Function) }),
    );

    // Drive the captured callbacks to assert they emit the right events.
    const events = start.mock.calls[0]?.[1] as {
      onLine: (line: string) => void;
      onExit: (code: number) => void;
    };
    events.onLine("PASS");
    events.onExit(0);
    expect(emit).toHaveBeenCalledWith("run:line", { line: "PASS" });
    expect(emit).toHaveBeenCalledWith("run:exit", { exitCode: 0 });
  });

  it("refuses to start when a run is already in progress", async () => {
    const start = vi.fn();
    const registry = new IpcRegistry();
    registerRunHandlers(registry, {
      runner: fakeRunner({ isRunning: () => true, start }),
      emitter: { emit: vi.fn() },
      projects: projectsReturning("/repo"),
    });

    await expect(registry.dispatch("run:start", { projectId: "p1" })).resolves.toEqual({
      started: false,
      reason: "Execução já em andamento.",
    });
    expect(start).not.toHaveBeenCalled();
  });

  it("refuses to start when the project has no Robot path", async () => {
    const start = vi.fn();
    const registry = new IpcRegistry();
    registerRunHandlers(registry, {
      runner: fakeRunner({ start }),
      emitter: { emit: vi.fn() },
      projects: projectsReturning(null),
    });

    await expect(registry.dispatch("run:start", { projectId: "p1" })).resolves.toEqual({
      started: false,
      reason: "Projeto sem repositório Robot configurado.",
    });
    expect(start).not.toHaveBeenCalled();
  });

  it("stops the current run", async () => {
    const stop = vi.fn();
    const registry = new IpcRegistry();
    registerRunHandlers(registry, {
      runner: fakeRunner({ stop }),
      emitter: { emit: vi.fn() },
      projects: projectsReturning("/repo"),
    });

    await registry.dispatch("run:stop", undefined);
    expect(stop).toHaveBeenCalled();
  });
});
