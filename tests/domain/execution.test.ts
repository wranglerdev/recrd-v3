import { describe, expect, it } from "vitest";
import { buildExecution, formatLogLine, resultFromExitCode } from "@domain/execution/execution";

describe("resultFromExitCode (PRD §15)", () => {
  it("maps Robot exit codes to results", () => {
    expect(resultFromExitCode(0)).toBe("passed");
    expect(resultFromExitCode(1)).toBe("failed");
    expect(resultFromExitCode(250)).toBe("failed");
    expect(resultFromExitCode(252)).toBe("error");
  });
});

describe("buildExecution", () => {
  it("computes duration and result", () => {
    const execution = buildExecution({
      id: "e1",
      caseId: "c1",
      user: "dev",
      startedAt: new Date("2026-06-20T10:00:00Z"),
      finishedAt: new Date("2026-06-20T10:00:05Z"),
      exitCode: 0,
      log: "ok",
    });
    expect(execution.durationMs).toBe(5000);
    expect(execution.result).toBe("passed");
    expect(execution.startedAt).toBe("2026-06-20T10:00:00.000Z");
  });

  it("clamps negative durations to zero", () => {
    const execution = buildExecution({
      id: "e1",
      caseId: "c1",
      user: "dev",
      startedAt: new Date("2026-06-20T10:00:05Z"),
      finishedAt: new Date("2026-06-20T10:00:00Z"),
      exitCode: 1,
      log: "",
    });
    expect(execution.durationMs).toBe(0);
    expect(execution.result).toBe("failed");
  });
});

describe("formatLogLine (PRD §15)", () => {
  it("prefixes the message with HH:MM:SS", () => {
    expect(formatLogLine(new Date("2026-06-20T10:35:01Z"), "Click login button")).toBe(
      "10:35:01 Click login button",
    );
  });
});
