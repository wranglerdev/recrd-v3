import { describe, expect, it } from "vitest";
import { createVersionInfo } from "@shared/version-info";

describe("createVersionInfo", () => {
  it("captures the supplied metadata with an ISO build date", () => {
    const info = createVersionInfo({
      version: "1.0.0",
      gitCommit: "a4f8d22",
      target: "win-x64",
      buildDate: new Date("2026-06-20T14:35:00Z"),
    });

    expect(info).toEqual({
      version: "1.0.0",
      gitCommit: "a4f8d22",
      buildDate: "2026-06-20T14:35:00.000Z",
      target: "win-x64",
    });
  });

  it("defaults the build date to now", () => {
    const before = Date.now();
    const info = createVersionInfo({ version: "1.0.0", gitCommit: "abc", target: "linux-x64" });
    const after = Date.now();

    const built = Date.parse(info.buildDate);
    expect(built).toBeGreaterThanOrEqual(before);
    expect(built).toBeLessThanOrEqual(after);
  });
});
