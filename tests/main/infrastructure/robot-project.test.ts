import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRobotProject, inspectRobotProject } from "@main/infrastructure/robot/robot-project";

describe("createRobotProject / inspectRobotProject (PRD §14)", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "recrd-robot-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("creates the standard tree and seed files", () => {
    const project = join(root, "robot-project");
    createRobotProject(project);

    expect(existsSync(join(project, "tests", "login.robot"))).toBe(true);
    expect(existsSync(join(project, "reports"))).toBe(true);
    expect(readFileSync(join(project, "requirements.txt"), "utf8")).toContain("robotframework");
  });

  it("recognises a created project as valid", () => {
    const project = join(root, "robot-project");
    createRobotProject(project);
    expect(inspectRobotProject(project)).toEqual({ valid: true, missing: [] });
  });

  it("flags an empty directory as missing required paths", () => {
    const empty = mkdtempSync(join(tmpdir(), "recrd-empty-"));
    try {
      expect(inspectRobotProject(empty)).toEqual({
        valid: false,
        missing: ["tests", "requirements.txt"],
      });
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });

  it("flags a non-existent directory as missing required paths", () => {
    expect(inspectRobotProject(join(root, "nope")).valid).toBe(false);
  });
});
