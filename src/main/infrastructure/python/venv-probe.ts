import { existsSync } from "node:fs";
import { join } from "node:path";

// Filesystem probe for a project-local Python virtual environment (PRD §14).
// Kept as a tiny adapter so the pure environment logic stays injectable and the
// Node `fs` access lives at the edge.

/** True when `root` is set and contains a `.venv` directory. */
export function directoryHasVenv(root: string | null): boolean {
  return root !== null && existsSync(join(root, ".venv"));
}
