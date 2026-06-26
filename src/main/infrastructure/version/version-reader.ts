import { readFileSync } from "node:fs";
import { createVersionInfo, type VersionInfo } from "../../../shared/version-info.js";

// Reads the build-time version.json embedded next to the main bundle (PRD §30).
// In a packaged build the file is present; in dev it is absent, so callers fall
// back to runtime metadata. Parsing is defensive — a missing or malformed file
// yields null rather than throwing, keeping app startup resilient.

function isVersionInfo(value: unknown): value is VersionInfo {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    typeof v.version === "string" &&
    typeof v.gitCommit === "string" &&
    typeof v.buildDate === "string" &&
    typeof v.target === "string"
  );
}

/** Reads and validates version.json; returns null when absent or malformed. */
export function readVersionFile(filePath: string): VersionInfo | null {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return isVersionInfo(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Resolves the version metadata: the embedded version.json when present, else a
 * dev fallback built from the running app's version + platform (no git/build
 * data available at runtime).
 */
export function resolveVersionInfo(
  filePath: string,
  fallback: { version: string; target: string },
): VersionInfo {
  return (
    readVersionFile(filePath) ??
    createVersionInfo({ version: fallback.version, gitCommit: "dev", target: fallback.target })
  );
}
