import type { FakeRobotRunConfig } from "./fake-robot-spawner.js";
import type { FakeInstallConfig } from "./fake-install-command-runner.js";

// Pure parsing of the RECRD_E2E_* environment variables that toggle the E2E test
// seams (electron-bzv.1, electron-bzv.3). Kept free of Electron/Node side effects
// so it is unit-tested; main.ts reads process.env, passes it here, and constructs
// the fakes from the result. None of these flags are set in production.

/** A minimal read-only view of the env, satisfied by process.env. */
export type EnvLike = Readonly<Record<string, string | undefined>>;

/** Default scripted Robot stdout when RECRD_E2E_FAKE_RUNNER_LINES is unset. */
export const DEFAULT_FAKE_ROBOT_LINES: readonly string[] = [
  "==============================================================================",
  "Tests :: recrd e2e fake suite",
  "==============================================================================",
  "Cenario de exemplo                                                    | PASS |",
  "------------------------------------------------------------------------------",
  "Tests :: recrd e2e fake suite                                         | PASS |",
  "==============================================================================",
];

function isTruthy(value: string | undefined): boolean {
  return value === "1" || value === "true";
}

function parseExitCode(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/** True when the deterministic Robot run + install seams should replace the real ones. */
export function isFakeRunnerEnabled(env: EnvLike): boolean {
  return isTruthy(env.RECRD_E2E_FAKE_RUNNER);
}

/** Robot fake config: scripted lines (newline-separated override) + exit code. */
export function parseFakeRobotConfig(env: EnvLike): FakeRobotRunConfig {
  const linesRaw = env.RECRD_E2E_FAKE_RUNNER_LINES;
  const lines =
    linesRaw !== undefined && linesRaw !== ""
      ? linesRaw.split("\n").filter((line) => line.length > 0)
      : DEFAULT_FAKE_ROBOT_LINES;
  return { lines, exitCode: parseExitCode(env.RECRD_E2E_FAKE_RUNNER_EXIT, 0) };
}

/** Install fake config: a chosen exit code (default success). */
export function parseFakeInstallConfig(env: EnvLike): FakeInstallConfig {
  return { exitCode: parseExitCode(env.RECRD_E2E_FAKE_INSTALL_EXIT, 0) };
}
