import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  sha256OfFile,
  writeChangelog,
  writeSha256Sums,
  writeVersionJson,
} from "../../scripts/lib/release-artifacts";
import { createVersionInfo } from "../../src/shared/version-info";

describe("release-artifacts", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "recrd-release-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("writes version.json with the metadata", () => {
    const info = createVersionInfo({
      version: "1.0.0",
      gitCommit: "abc1234",
      target: "win-x64",
      buildDate: new Date("2026-06-20T14:35:00Z"),
    });

    const path = writeVersionJson(dir, info);

    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual(info);
  });

  it("computes a stable sha256 and writes a sorted SHA256SUM.txt", () => {
    const fileA = join(dir, "a.bin");
    const fileB = join(dir, "b.bin");
    writeFileSync(fileA, "hello");
    writeFileSync(fileB, "world");

    // Known SHA-256 of "hello".
    expect(sha256OfFile(fileA)).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );

    const sumsPath = writeSha256Sums(dir, [fileB, fileA]);
    const contents = readFileSync(sumsPath, "utf8");

    expect(contents.split("\n")[0]).toContain("a.bin");
    expect(contents.split("\n")[1]).toContain("b.bin");
  });

  it("writes CHANGELOG.md with a titled section", () => {
    const path = writeChangelog(dir, "1.2.0", new Date("2026-06-20T00:00:00Z"), [
      { hash: "abc1234", subject: "feat: x" },
    ]);
    const contents = readFileSync(path, "utf8");

    expect(contents).toBe("# Changelog\n\n## 1.2.0 - 2026-06-20\n\n- feat: x (abc1234)\n");
  });
});
