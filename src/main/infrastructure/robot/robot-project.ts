import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  ROBOT_PROJECT_DIRS,
  missingRobotPaths,
  robotProjectFiles,
} from "../../../domain/robot/robot-project-template.js";

// Robot project scaffolding and inspection on disk (PRD §14). The layout/seed
// files come from the domain template; this writes/reads them.

/** Creates the standard Robot project tree under `root`; returns created paths. */
export function createRobotProject(root: string): string[] {
  const created: string[] = [];
  for (const dir of ROBOT_PROJECT_DIRS) {
    const full = join(root, dir);
    mkdirSync(full, { recursive: true });
    created.push(full);
  }
  for (const file of robotProjectFiles()) {
    const full = join(root, file.path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, file.content, "utf8");
    created.push(full);
  }
  return created;
}

export type RobotProjectInspection = {
  readonly valid: boolean;
  readonly missing: readonly string[];
};

/** Checks whether an existing directory is a usable Robot project (PRD §14). */
export function inspectRobotProject(root: string): RobotProjectInspection {
  const existing = existsSync(root) ? readdirSync(root) : [];
  const missing = missingRobotPaths(existing);
  return { valid: missing.length === 0, missing };
}

/**
 * The Robot-project capability as a single injectable service. Groups the
 * scaffold/inspect functions so the composition root can register one token and
 * use cases depend on the interface rather than the loose module functions.
 */
export type RobotProjectService = {
  create(root: string): string[];
  inspect(root: string): RobotProjectInspection;
};

export function createRobotProjectService(): RobotProjectService {
  return { create: createRobotProject, inspect: inspectRobotProject };
}
