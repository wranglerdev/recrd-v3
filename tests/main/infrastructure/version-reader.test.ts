import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readVersionFile, resolveVersionInfo } from "@main/infrastructure/version/version-reader";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "recrd-version-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const VALID = {
  version: "1.2.3",
  gitCommit: "abc1234",
  buildDate: "2026-06-26T00:00:00.000Z",
  target: "win-x64",
};

describe("readVersionFile", () => {
  it("reads and validates a well-formed version.json", () => {
    const file = join(dir, "version.json");
    writeFileSync(file, JSON.stringify(VALID), "utf8");
    expect(readVersionFile(file)).toEqual(VALID);
  });

  it("returns null when the file is missing", () => {
    expect(readVersionFile(join(dir, "absent.json"))).toBeNull();
  });

  it("returns null on malformed JSON", () => {
    const file = join(dir, "bad.json");
    writeFileSync(file, "{ not json", "utf8");
    expect(readVersionFile(file)).toBeNull();
  });

  it("returns null when fields are missing or wrong-typed", () => {
    const file = join(dir, "partial.json");
    writeFileSync(file, JSON.stringify({ version: "1.0.0", gitCommit: 5 }), "utf8");
    expect(readVersionFile(file)).toBeNull();
  });

  it("returns null for a non-object JSON value", () => {
    const file = join(dir, "scalar.json");
    writeFileSync(file, '"just a string"', "utf8");
    expect(readVersionFile(file)).toBeNull();
  });
});

describe("resolveVersionInfo", () => {
  it("uses the file when present", () => {
    const file = join(dir, "version.json");
    writeFileSync(file, JSON.stringify(VALID), "utf8");
    expect(resolveVersionInfo(file, { version: "9.9.9", target: "linux-x64" })).toEqual(VALID);
  });

  it("falls back to runtime metadata when the file is absent", () => {
    const info = resolveVersionInfo(join(dir, "absent.json"), {
      version: "9.9.9",
      target: "linux-x64",
    });
    expect(info.version).toBe("9.9.9");
    expect(info.gitCommit).toBe("dev");
    expect(info.target).toBe("linux-x64");
    expect(() => new Date(info.buildDate).toISOString()).not.toThrow();
  });
});
