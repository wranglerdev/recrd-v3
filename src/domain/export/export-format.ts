import type { ManualScript } from "../scripts/script-action.js";

// Pure serialization and file-naming for exports (PRD §17). The actual file
// writing is done by the application/infrastructure layers; this stays platform-
// agnostic and fully testable.

/** Filesystem-safe slug from a test/script name: "Login Banco XYZ" -> "login-banco-xyz". */
export function slugifyExportName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length === 0 ? "export" : slug;
}

/** Raw manual-script JSON file name, e.g. "login.recrd.json" (PRD §17). */
export function recrdJsonFileName(name: string): string {
  return `${slugifyExportName(name)}.recrd.json`;
}

/** Compiled Robot file name, e.g. "login.robot" (PRD §17). */
export function robotFileName(name: string): string {
  return `${slugifyExportName(name)}.robot`;
}

/** Execution log file name for a date, e.g. "execution-2026-06-20.log" (PRD §17). */
export function executionLogFileName(date: Date): string {
  return `execution-${date.toISOString().slice(0, 10)}.log`;
}

/** Pretty-prints the manual script as JSON (trailing newline for clean diffs). */
export function serializeManualScript(script: ManualScript): string {
  return `${JSON.stringify(script, null, 2)}\n`;
}
