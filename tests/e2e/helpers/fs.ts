import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";

// Filesystem assertion helpers for E2E (electron-bzv.4). Flow suites assert the
// app's real on-disk outputs: exported JSON/.robot artifacts, execution logs and
// scaffolded Robot repository trees. These run in the Playwright (Node) process,
// reading files the Electron app wrote to its isolated userData dir.

/** Lists the file names directly under a directory (empty when it does not exist). */
export function listDir(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir).sort();
}

/** Reads a UTF-8 file under {@link dir} by name. */
export function readFileIn(dir: string, name: string): string {
  return readFileSync(join(dir, name), "utf8");
}

/** True when a path exists on disk. */
export function pathExists(path: string): boolean {
  return existsSync(path);
}

/** Creates a throwaway directory (e.g. a scaffold root / CSV fixture home). */
export function makeTempDir(prefix = "recrd-e2e-fixture-"): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

/** Recursively removes a directory created by {@link makeTempDir} (best effort). */
export function removeDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

/** Writes `content` to `name` under `dir`, returning the absolute file path. */
export function writeFileUnder(dir: string, name: string, content: string): string {
  const path = join(dir, name);
  writeFileSync(path, content, "utf8");
  return path;
}

/**
 * Returns every file under `root` as a sorted list of POSIX-style relative paths,
 * for asserting the shape of a scaffolded Robot repository tree.
 */
export function readTree(root: string): string[] {
  if (!existsSync(root)) {
    return [];
  }
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        files.push(relative(root, full).split(sep).join("/"));
      }
    }
  };
  walk(root);
  return files.sort();
}
