import { describe, expect, it } from "vitest";
import {
  DEFAULT_FAKE_ROBOT_LINES,
  isFakeRunnerEnabled,
  parseFakeInstallConfig,
  parseFakeRobotConfig,
} from "@main/infrastructure/e2e/e2e-seam-config";

describe("isFakeRunnerEnabled", () => {
  it("is true for the documented truthy values and false otherwise", () => {
    expect(isFakeRunnerEnabled({ RECRD_E2E_FAKE_RUNNER: "1" })).toBe(true);
    expect(isFakeRunnerEnabled({ RECRD_E2E_FAKE_RUNNER: "true" })).toBe(true);
    expect(isFakeRunnerEnabled({ RECRD_E2E_FAKE_RUNNER: "0" })).toBe(false);
    expect(isFakeRunnerEnabled({})).toBe(false);
  });
});

describe("parseFakeRobotConfig", () => {
  it("defaults to the scripted lines and exit 0 when unset", () => {
    expect(parseFakeRobotConfig({})).toEqual({
      lines: DEFAULT_FAKE_ROBOT_LINES,
      exitCode: 0,
    });
  });

  it("splits an explicit line override and drops blanks", () => {
    const config = parseFakeRobotConfig({
      RECRD_E2E_FAKE_RUNNER_LINES: "a\n\nb\n",
      RECRD_E2E_FAKE_RUNNER_EXIT: "1",
    });
    expect(config).toEqual({ lines: ["a", "b"], exitCode: 1 });
  });

  it("falls back to 0 for an empty or non-numeric exit code", () => {
    expect(parseFakeRobotConfig({ RECRD_E2E_FAKE_RUNNER_EXIT: "" }).exitCode).toBe(0);
    expect(parseFakeRobotConfig({ RECRD_E2E_FAKE_RUNNER_EXIT: "nope" }).exitCode).toBe(0);
    expect(parseFakeRobotConfig({ RECRD_E2E_FAKE_RUNNER_LINES: "" }).lines).toEqual(
      DEFAULT_FAKE_ROBOT_LINES,
    );
  });
});

describe("parseFakeInstallConfig", () => {
  it("defaults to exit 0 and honors an override", () => {
    expect(parseFakeInstallConfig({})).toEqual({ exitCode: 0 });
    expect(parseFakeInstallConfig({ RECRD_E2E_FAKE_INSTALL_EXIT: "3" })).toEqual({ exitCode: 3 });
  });
});
