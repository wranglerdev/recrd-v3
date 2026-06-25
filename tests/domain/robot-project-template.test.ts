import { describe, expect, it } from "vitest";
import {
  ROBOT_PROJECT_DIRS,
  missingRobotPaths,
  requiredRobotPaths,
  robotProjectFiles,
} from "@domain/robot/robot-project-template";

describe("robot project template (PRD §14)", () => {
  it("defines the standard directories and seed files", () => {
    expect(ROBOT_PROJECT_DIRS).toContain("tests");
    expect(ROBOT_PROJECT_DIRS).toContain("reports");
    const files = robotProjectFiles().map((f) => f.path);
    expect(files).toEqual(["tests/login.robot", "requirements.txt", ".gitignore"]);
  });

  it("requires tests/ and requirements.txt", () => {
    expect(requiredRobotPaths()).toEqual(["tests", "requirements.txt"]);
  });

  it("reports which required paths are missing", () => {
    expect(missingRobotPaths(["tests", "requirements.txt", "resources"])).toEqual([]);
    expect(missingRobotPaths(["resources"])).toEqual(["tests", "requirements.txt"]);
  });
});
