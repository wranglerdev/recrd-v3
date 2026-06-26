import { describe, expect, it, vi } from "vitest";
import { registerEnvironmentHandlers } from "@main/ipc/handlers/environment-handlers";
import { IpcRegistry } from "@main/ipc/typed-ipc";
import type { ToolRunner } from "@main/infrastructure/python/environment";

function runnerFrom(map: Record<string, string | null>): ToolRunner {
  return (command) => map[command] ?? null;
}

describe("registerEnvironmentHandlers (PRD §14)", () => {
  it("reports a ready environment with an empty plan", async () => {
    const toolRunner = runnerFrom({ python: "Python 3.11.4", robot: "RF 7.0", rfbrowser: "18.0" });
    const venvPresent = vi.fn().mockReturnValue(true);
    const registry = new IpcRegistry();
    registerEnvironmentHandlers(registry, { toolRunner, venvPresent });

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
    const toolRunner = runnerFrom({});
    const registry = new IpcRegistry();
    registerEnvironmentHandlers(registry, { toolRunner, venvPresent: () => false });

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
