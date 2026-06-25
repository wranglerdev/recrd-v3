import { describe, expect, it } from "vitest";
import { generateRobot } from "@domain/compiler/robot-generator";
import { optimizeScript } from "@domain/compiler/optimize-script";
import { validateRobotSyntax } from "@domain/compiler/validate-robot";
import type { ManualScript } from "@domain/scripts/script-action";

describe("optimizeScript (PRD §13)", () => {
  it("drops consecutive duplicate actions", () => {
    const script: ManualScript = {
      name: "T",
      actions: [
        { type: "click", selector: "#a" },
        { type: "click", selector: "#a" },
        { type: "click", selector: "#b" },
      ],
    };
    expect(optimizeScript(script).actions).toEqual([
      { type: "click", selector: "#a" },
      { type: "click", selector: "#b" },
    ]);
  });

  it("collapses consecutive navigations to the final destination", () => {
    const script: ManualScript = {
      name: "T",
      actions: [
        { type: "navigate", url: "https://a.com" },
        { type: "navigate", url: "https://b.com" },
        { type: "click", selector: "#x" },
      ],
    };
    expect(optimizeScript(script).actions).toEqual([
      { type: "navigate", url: "https://b.com" },
      { type: "click", selector: "#x" },
    ]);
  });

  it("leaves a non-redundant script unchanged", () => {
    const script: ManualScript = {
      name: "T",
      actions: [
        { type: "click", selector: "#a" },
        { type: "input", selector: "#b", value: "x" },
      ],
    };
    expect(optimizeScript(script).actions).toEqual(script.actions);
  });
});

describe("validateRobotSyntax (PRD §13)", () => {
  it("accepts generator output", () => {
    const robot = generateRobot({
      name: "Login",
      actions: [{ type: "navigate", url: "https://example.com" }],
    });
    expect(validateRobotSyntax(robot)).toEqual({ valid: true, errors: [] });
  });

  it("reports all missing structural pieces", () => {
    const result = validateRobotSyntax("not robot at all");
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/settings/i),
        expect.stringMatching(/library.*browser/i),
        expect.stringMatching(/test cases/i),
        expect.stringMatching(/no test case/i),
      ]),
    );
  });

  it("flags a Test Cases section with no test case", () => {
    const robot = ["*** Settings ***", "Library    Browser", "", "*** Test Cases ***", ""].join(
      "\n",
    );
    const result = validateRobotSyntax(robot);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([expect.stringMatching(/no test case/i)]);
  });
});
