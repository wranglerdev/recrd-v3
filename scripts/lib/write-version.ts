import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { createVersionInfo, type VersionInfo } from "../../src/shared/version-info.js";
import { currentTarget, getGitCommit, readPackageVersion } from "./build-meta.js";

// Emits version.json at build time (PRD §30) so the packaged app can show
// reproducible-build metadata in the "Sobre" screen. The git/package reads live
// in build-meta; the JSON shaping is kept pure here for testability.

/** Serialises version metadata to the on-disk version.json content (pretty + EOL). */
export function versionJsonContent(info: VersionInfo): string {
  return `${JSON.stringify(info, null, 2)}\n`;
}

/** Builds the version metadata from the current git/package state. */
export function collectVersionInfo(): VersionInfo {
  return createVersionInfo({
    version: readPackageVersion(),
    gitCommit: getGitCommit(),
    target: currentTarget(),
  });
}

/** Writes version.json into `outDir`; returns the written path. */
export function writeVersionJson(outDir: string): string {
  const filePath = join(outDir, "version.json");
  writeFileSync(filePath, versionJsonContent(collectVersionInfo()), "utf8");
  return filePath;
}
