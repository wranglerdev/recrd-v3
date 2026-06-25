import { execFileSync } from "node:child_process";

// Python/Robot/Playwright environment verification and install planning
// (PRD §14). The tool runner is injectable so the logic is unit-testable; the
// default runner shells out via execFile. Actual installs are executed by the
// main process from the returned plan.

export type ToolRunner = (command: string, args: string[]) => string | null;

export type EnvironmentReport = {
  readonly python: { readonly installed: boolean; readonly version: string | null };
  readonly robotFramework: boolean;
  readonly playwrightBrowser: boolean;
  readonly venvPresent: boolean;
  readonly ready: boolean;
};

/** Default runner: returns stdout, or null when the command is missing/fails. */
export const nodeToolRunner: ToolRunner = (command, args) => {
  try {
    return execFileSync(command, args, { encoding: "utf8" });
  } catch {
    return null;
  }
};

/** Extracts a semantic version from `python --version` output, e.g. "3.11.4". */
export function parsePythonVersion(output: string): string | null {
  const match = /(\d+\.\d+\.\d+)/.exec(output);
  // The capture group is always present when the regex matches.
  return match === null ? null : (match[1] as string);
}

/** Probes the toolchain and reports what is available (PRD §14). */
export function checkEnvironment(run: ToolRunner, venvPresent: boolean): EnvironmentReport {
  const pythonOutput = run("python", ["--version"]) ?? run("python3", ["--version"]);
  const version = pythonOutput === null ? null : parsePythonVersion(pythonOutput);
  const robotFramework = run("robot", ["--version"]) !== null;
  const playwrightBrowser = run("rfbrowser", ["--version"]) !== null;
  const ready = version !== null && robotFramework && playwrightBrowser && venvPresent;

  return {
    python: { installed: version !== null, version },
    robotFramework,
    playwrightBrowser,
    venvPresent,
    ready,
  };
}

/** Commands needed to bring the environment up to scratch ("Instalar ambiente"). */
export function installPlan(report: EnvironmentReport): string[] {
  const plan: string[] = [];
  if (!report.venvPresent) {
    plan.push("python -m venv .venv");
  }
  if (!report.robotFramework) {
    plan.push("pip install robotframework");
  }
  if (!report.playwrightBrowser) {
    plan.push("pip install robotframework-browser");
    plan.push("rfbrowser init");
  }
  return plan;
}
