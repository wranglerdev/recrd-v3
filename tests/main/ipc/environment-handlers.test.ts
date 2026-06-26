import { describe, expect, it, vi } from "vitest";
import { registerEnvironmentHandlers } from "@main/ipc/handlers/environment-handlers";
import { IpcRegistry } from "@main/ipc/typed-ipc";
import type { ToolRunner } from "@main/infrastructure/python/environment";
import type { InstallUseCases } from "@application/environment/install-service";

function runnerFrom(map: Record<string, string | null>): ToolRunner {
  return (command) => map[command] ?? null;
}

function fakeInstall(overrides: Partial<InstallUseCases> = {}): InstallUseCases {
  return {
    isRunning: () => false,
    run: vi.fn(async () => undefined),
    ...overrides,
  };
}

const READY_RUNNER = runnerFrom({ python: "Python 3.11.4", robot: "RF 7.0", rfbrowser: "18.0" });

describe("registerEnvironmentHandlers — env:check (PRD §14)", () => {
  it("reports a ready environment with an empty plan", async () => {
    const venvPresent = vi.fn().mockReturnValue(true);
    const registry = new IpcRegistry();
    registerEnvironmentHandlers(registry, {
      toolRunner: READY_RUNNER,
      venvPresent,
      install: fakeInstall(),
    });

    await expect(registry.dispatch("env:check", { root: "/repo" })).resolves.toEqual({
      report: {
        python: { installed: true, version: "3.11.4" },
        robotFramework: true,
        playwrightBrowser: true,
        venvPresent: true,
        ready: true,
      },
      plan: [],
    });
    expect(venvPresent).toHaveBeenCalledWith("/repo");
  });

  it("returns the install plan for an incomplete environment", async () => {
    const registry = new IpcRegistry();
    registerEnvironmentHandlers(registry, {
      toolRunner: runnerFrom({}),
      venvPresent: () => false,
      install: fakeInstall(),
    });

    const status = await registry.dispatch("env:check", { root: null });
    expect(status.report.ready).toBe(false);
    expect(status.plan).toEqual([
      "python -m venv .venv",
      "pip install robotframework",
      "pip install robotframework-browser",
      "rfbrowser init",
    ]);
  });
});

describe("registerEnvironmentHandlers — env:install (PRD §14)", () => {
  it("starts the install, recomputing the plan (never trusting the renderer)", async () => {
    const run = vi.fn(async () => undefined);
    const registry = new IpcRegistry();
    registerEnvironmentHandlers(registry, {
      toolRunner: runnerFrom({}),
      venvPresent: () => false,
      install: fakeInstall({ run }),
    });

    await expect(registry.dispatch("env:install", { root: "/repo" })).resolves.toEqual({
      started: true,
    });
    expect(run).toHaveBeenCalledWith(
      [
        "python -m venv .venv",
        "pip install robotframework",
        "pip install robotframework-browser",
        "rfbrowser init",
      ],
      "/repo",
    );
  });

  it("refuses to start when an install is already running", async () => {
    const run = vi.fn();
    const registry = new IpcRegistry();
    registerEnvironmentHandlers(registry, {
      toolRunner: runnerFrom({}),
      venvPresent: () => false,
      install: fakeInstall({ isRunning: () => true, run }),
    });

    await expect(registry.dispatch("env:install", { root: "/repo" })).resolves.toEqual({
      started: false,
      reason: "Instalação já em andamento.",
    });
    expect(run).not.toHaveBeenCalled();
  });

  it("does nothing when the environment is already ready", async () => {
    const run = vi.fn();
    const registry = new IpcRegistry();
    registerEnvironmentHandlers(registry, {
      toolRunner: READY_RUNNER,
      venvPresent: () => true,
      install: fakeInstall({ run }),
    });

    await expect(registry.dispatch("env:install", { root: "/repo" })).resolves.toEqual({
      started: false,
      reason: "Ambiente já está pronto.",
    });
    expect(run).not.toHaveBeenCalled();
  });
});
