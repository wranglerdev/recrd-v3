import { describe, expect, it, vi } from "vitest";
import { registerRunHandlers, type RobotRunController } from "@main/ipc/handlers/run-handlers";
import { IpcRegistry } from "@main/ipc/typed-ipc";
import type { ProjectUseCases } from "@application/project/project-service";
import type { ExecutionUseCases } from "@application/execution/execution-service";

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

type Deps = Parameters<typeof registerRunHandlers>[1];

function deps(overrides: Partial<Deps> = {}): Deps {
  return {
    runner: fakeRunner(),
    emitter: { emit: vi.fn() },
    projects: projectsReturning("/repo"),
    executions: { record: vi.fn() } as Pick<ExecutionUseCases, "record">,
    clock: () => new Date("2026-06-26T10:00:00.000Z"),
    ...overrides,
  };
}

function startEvents(start: ReturnType<typeof vi.fn>): {
  onLine: (line: string) => void;
  onExit: (code: number) => void;
} {
  return start.mock.calls[0]?.[1] as {
    onLine: (line: string) => void;
    onExit: (code: number) => void;
  };
}

describe("registerRunHandlers (PRD §15)", () => {
  it("starts the run and forwards stdout/exit over the event emitter", async () => {
    const emit = vi.fn();
    const start = vi.fn();
    const registry = new IpcRegistry();
    registerRunHandlers(registry, deps({ runner: fakeRunner({ start }), emitter: { emit } }));

    await expect(registry.dispatch("run:start", { projectId: "p1" })).resolves.toEqual({
      started: true,
    });
    expect(start).toHaveBeenCalledWith(
      { cwd: "/repo", testPath: "tests" },
      expect.objectContaining({ onLine: expect.any(Function), onExit: expect.any(Function) }),
    );

    const events = startEvents(start);
    events.onLine("PASS");
    events.onExit(0);
    expect(emit).toHaveBeenCalledWith("run:line", { line: "PASS" });
    expect(emit).toHaveBeenCalledWith("run:exit", { exitCode: 0 });
  });

  it("records an execution with the accumulated log when a caseId is given", async () => {
    const start = vi.fn();
    const record = vi.fn();
    let now = "2026-06-26T10:00:00.000Z";
    const registry = new IpcRegistry();
    registerRunHandlers(
      registry,
      deps({
        runner: fakeRunner({ start }),
        executions: { record },
        clock: () => new Date(now),
      }),
    );

    await registry.dispatch("run:start", { projectId: "p1", caseId: "c1" });
    const events = startEvents(start);
    events.onLine("line 1");
    events.onLine("line 2");
    now = "2026-06-26T10:00:05.000Z";
    events.onExit(1);

    expect(record).toHaveBeenCalledWith({
      caseId: "c1",
      startedAt: new Date("2026-06-26T10:00:00.000Z"),
      finishedAt: new Date("2026-06-26T10:00:05.000Z"),
      exitCode: 1,
      log: "line 1\nline 2",
    });
  });

  it("does not record an execution when no caseId is given", async () => {
    const start = vi.fn();
    const record = vi.fn();
    const registry = new IpcRegistry();
    registerRunHandlers(registry, deps({ runner: fakeRunner({ start }), executions: { record } }));

    await registry.dispatch("run:start", { projectId: "p1" });
    startEvents(start).onExit(0);
    expect(record).not.toHaveBeenCalled();
  });

  it("refuses to start when a run is already in progress", async () => {
    const start = vi.fn();
    const registry = new IpcRegistry();
    registerRunHandlers(registry, deps({ runner: fakeRunner({ isRunning: () => true, start }) }));

    await expect(registry.dispatch("run:start", { projectId: "p1" })).resolves.toEqual({
      started: false,
      reason: "Execução já em andamento.",
    });
    expect(start).not.toHaveBeenCalled();
  });

  it("refuses to start when the project has no Robot path", async () => {
    const start = vi.fn();
    const registry = new IpcRegistry();
    registerRunHandlers(
      registry,
      deps({ runner: fakeRunner({ start }), projects: projectsReturning(null) }),
    );

    await expect(registry.dispatch("run:start", { projectId: "p1" })).resolves.toEqual({
      started: false,
      reason: "Projeto sem repositório Robot configurado.",
    });
    expect(start).not.toHaveBeenCalled();
  });

  it("stops the current run", async () => {
    const stop = vi.fn();
    const registry = new IpcRegistry();
    registerRunHandlers(registry, deps({ runner: fakeRunner({ stop }) }));

    await registry.dispatch("run:stop", undefined);
    expect(stop).toHaveBeenCalled();
  });
});
