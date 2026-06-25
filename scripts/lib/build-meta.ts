import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import type { CommitEntry } from "./release-format.js";

// Build-time git/package metadata helpers (PRD §27, §30). Thin wrappers over the
// git CLI and package.json; the pure formatting/shaping lives in release-format.

/** The `version` field from package.json. */
export function readPackageVersion(): string {
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { version?: string };
  if (typeof pkg.version !== "string") {
    throw new Error("package.json is missing a string 'version' field");
  }
  return pkg.version;
}

/** Short HEAD commit hash. */
export function getGitCommit(): string {
  return execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
}

/** The most recent commits as changelog entries (newest first). */
export function getRecentCommits(limit = 50): CommitEntry[] {
  // Tab-delimited so subjects (which never contain tabs) parse unambiguously.
  const out = execFileSync("git", ["log", `-n${String(limit)}`, "--pretty=%h\t%s"], {
    encoding: "utf8",
  });
  return out
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => {
      const tab = line.indexOf("\t");
      return { hash: line.slice(0, tab), subject: line.slice(tab + 1) };
    });
}

/** Current packaging target, e.g. "win-x64" / "linux-x64". */
export function currentTarget(): string {
  const platform =
    process.platform === "win32" ? "win" : process.platform === "darwin" ? "mac" : "linux";
  return `${platform}-${process.arch}`;
}
