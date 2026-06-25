import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { VersionInfo } from "../../src/shared/version-info.js";
import {
  formatSha256Sums,
  type ChecksumEntry,
  type CommitEntry,
  formatChangelog,
} from "./release-format.js";

// Build-time I/O for the reproducible release artifacts (PRD §27, §30):
// version.json, SHA256SUM.txt and CHANGELOG.md under release/.

/** SHA-256 hex digest of a file's contents. */
export function sha256OfFile(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

/** Writes version.json into `releaseDir` and returns its path. */
export function writeVersionJson(releaseDir: string, info: VersionInfo): string {
  const target = join(releaseDir, "version.json");
  writeFileSync(target, `${JSON.stringify(info, null, 2)}\n`, "utf8");
  return target;
}

/** Hashes the given artifact files and writes SHA256SUM.txt; returns its path. */
export function writeSha256Sums(releaseDir: string, files: readonly string[]): string {
  const entries: ChecksumEntry[] = files.map((file) => ({
    file: basename(file),
    sha256: sha256OfFile(file),
  }));
  const target = join(releaseDir, "SHA256SUM.txt");
  writeFileSync(target, formatSha256Sums(entries), "utf8");
  return target;
}

/** Writes CHANGELOG.md for one release into `releaseDir`; returns its path. */
export function writeChangelog(
  releaseDir: string,
  version: string,
  date: Date,
  commits: readonly CommitEntry[],
): string {
  const target = join(releaseDir, "CHANGELOG.md");
  writeFileSync(target, `# Changelog\n\n${formatChangelog(version, date, commits)}`, "utf8");
  return target;
}
