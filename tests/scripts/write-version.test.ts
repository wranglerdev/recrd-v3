import { describe, expect, it } from "vitest";
import { versionJsonContent } from "../../scripts/lib/write-version";

describe("versionJsonContent", () => {
  it("serialises version metadata as pretty JSON ending in a newline", () => {
    const content = versionJsonContent({
      version: "1.0.0",
      gitCommit: "abc1234",
      buildDate: "2026-06-26T00:00:00.000Z",
      target: "win-x64",
    });

    expect(content.endsWith("\n")).toBe(true);
    expect(JSON.parse(content)).toEqual({
      version: "1.0.0",
      gitCommit: "abc1234",
      buildDate: "2026-06-26T00:00:00.000Z",
      target: "win-x64",
    });
    // Pretty-printed (2-space indent).
    expect(content).toContain('\n  "version": "1.0.0"');
  });
});
