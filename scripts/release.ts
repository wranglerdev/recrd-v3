import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createVersionInfo } from "../src/shared/version-info.js";
import {
  currentTarget,
  getGitCommit,
  getRecentCommits,
  readPackageVersion,
} from "./lib/build-meta.js";
import { writeChangelog, writeSha256Sums, writeVersionJson } from "./lib/release-artifacts.js";

// Local release pipeline (PRD §26, §28): clean -> npm ci -> tests -> package with
// electron-builder -> generate version.json + SHA256SUM.txt + CHANGELOG.md under
// release/. Set RECRD_SKIP_PACKAGE=1 to skip electron-builder (e.g. on Linux CI
// generating only the metadata).
const RELEASE_DIR = "release";

function run(command: string, args: string[]): void {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function clean(): void {
  rmSync(RELEASE_DIR, { recursive: true, force: true });
  rmSync("dist", { recursive: true, force: true });
  mkdirSync(RELEASE_DIR, { recursive: true });
}

function packagedArtifacts(): string[] {
  if (!existsSync(RELEASE_DIR)) {
    return [];
  }
  return readdirSync(RELEASE_DIR)
    .filter((name) => name.endsWith(".exe"))
    .map((name) => join(RELEASE_DIR, name));
}

function main(): void {
  clean();
  run("npm", ["ci"]);
  run("npm", ["test"]);
  run("npm", ["run", "build:renderer"]);
  run("npm", ["run", "build:main"]);

  if (process.env.RECRD_SKIP_PACKAGE !== "1") {
    run("npx", ["electron-builder", "--win", "--x64"]);
  }

  const version = readPackageVersion();
  const info = createVersionInfo({ version, gitCommit: getGitCommit(), target: currentTarget() });
  writeVersionJson(RELEASE_DIR, info);
  writeChangelog(RELEASE_DIR, version, new Date(), getRecentCommits());
  writeSha256Sums(RELEASE_DIR, packagedArtifacts());

  console.log(`Release ${version} prepared in ./${RELEASE_DIR}`);
}

main();
