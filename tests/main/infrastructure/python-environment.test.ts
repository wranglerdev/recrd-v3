import { describe, expect, it } from "vitest";
import {
  checkEnvironment,
  installPlan,
  nodeToolRunner,
  parsePythonVersion,
  type ToolRunner,
} from "@main/infrastructure/python/environment";

describe("parsePythonVersion", () => {
  it("extracts the version", () => {
    expect(parsePythonVersion("Python 3.11.4")).toBe("3.11.4");
  });
  it("returns null for unparseable output", () => {
    expect(parsePythonVersion("no version here")).toBeNull();
  });
});

describe("nodeToolRunner", () => {
  it("returns stdout for an existing command", () => {
    expect(nodeToolRunner("node", ["--version"])).toContain("v");
  });
  it("returns null for a missing command", () => {
    expect(nodeToolRunner("definitely-not-a-real-command-xyz", [])).toBeNull();
  });
});

function runnerFrom(map: Record<string, string | null>): ToolRunner {
  return (command) => map[command] ?? null;
}

describe("checkEnvironment (PRD §14)", () => {
  it("reports a fully ready environment", () => {
    const run = runnerFrom({
      python: "Python 3.11.4",
      robot: "Robot Framework 7.0",
      rfbrowser: "18.0.0",
    });
    expect(checkEnvironment(run, true)).toEqual({
      python: { installed: true, version: "3.11.4" },
      robotFramework: true,
      playwrightBrowser: true,
      venvPresent: true,
      ready: true,
    });
  });

  it("falls back to python3 and is not ready when tools are missing", () => {
    const run = runnerFrom({ python: null, python3: "Python 3.12.1" });
    const report = checkEnvironment(run, false);
    expect(report.python.version).toBe("3.12.1");
    expect(report.robotFramework).toBe(false);
    expect(report.ready).toBe(false);
  });

  it("reports no python when neither interpreter is found", () => {
    const report = checkEnvironment(runnerFrom({}), true);
    expect(report.python).toEqual({ installed: false, version: null });
  });
});

describe("installPlan", () => {
  it("plans nothing for a ready environment", () => {
    const ready = checkEnvironment(
      runnerFrom({ python: "Python 3.11.4", robot: "x", rfbrowser: "y" }),
      true,
    );
    expect(installPlan(ready)).toEqual([]);
  });

  it("plans venv, robot and browser installs when missing", () => {
    const empty = checkEnvironment(runnerFrom({}), false);
    expect(installPlan(empty)).toEqual([
      "python -m venv .venv",
      "pip install robotframework",
      "pip install robotframework-browser",
      "rfbrowser init",
    ]);
  });
});
