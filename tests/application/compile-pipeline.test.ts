import { describe, expect, it } from "vitest";
import { compileScript } from "../../src/application/compile/compile-pipeline";
import type { ManualScript } from "../../src/domain/scripts/script-action";

describe("compileScript (PRD §13)", () => {
  it("compiles a valid script to Robot Framework code", () => {
    const script: ManualScript = {
      name: "Login XYZ",
      actions: [
        { type: "navigate", url: "https://example.com" },
        { type: "input", selector: "#user", value: "{{usuario}}" },
        { type: "click", selector: "#submit" },
      ],
    };

    const result = compileScript(script);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.robot).toContain("Library    Browser");
      expect(result.robot).toContain("Login XYZ");
      expect(result.robot).toContain("Fill Text    #user    ${usuario}");
      expect(result.warnings).toEqual([]);
    }
  });

  it("optimises the script before generating (collapses duplicates)", () => {
    const script: ManualScript = {
      name: "Dup",
      actions: [
        { type: "click", selector: "#a" },
        { type: "click", selector: "#a" },
      ],
    };

    const result = compileScript(script);
    expect(result.ok).toBe(true);
    if (result.ok) {
      // The duplicate click is collapsed: only one "Click    #a" step.
      const clicks = result.robot.split("\n").filter((line) => line.includes("Click    #a"));
      expect(clicks).toHaveLength(1);
    }
  });

  it("fails at the script stage with aggregated validation errors", () => {
    const script: ManualScript = { name: "", actions: [] };

    const result = compileScript(script);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe("script");
      expect(result.scriptErrors.length).toBeGreaterThan(0);
      expect(result.robotErrors).toEqual([]);
    }
  });

  it("fails at the robot stage when the generated output is malformed", () => {
    // A non-blank but space-prefixed name passes script validation yet yields a
    // Robot file whose test-case line is indented — validate-robot rejects it.
    const script: ManualScript = {
      name: "   Indented",
      actions: [{ type: "click", selector: "#a" }],
    };

    const result = compileScript(script);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe("robot");
      expect(result.robotErrors.length).toBeGreaterThan(0);
    }
  });

  it("warns about unstable selectors without blocking compilation", () => {
    const script: ManualScript = {
      name: "Brittle",
      actions: [
        { type: "navigate", url: "https://example.com" }, // no selector
        { type: "click", selector: "div:nth-child(2)" }, // positional CSS → unstable
        { type: "click", selector: "xpath=/html/body/div" }, // absolute xpath → unstable
        { type: "click", selector: "xpath=//button[@id='ok']" }, // relative xpath → stable
        { type: "click", selector: "#stable" }, // stable
      ],
    };

    const result = compileScript(script);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warnings.map((w) => w.index)).toEqual([1, 2]);
      expect(result.warnings[0]?.message).toMatch(/instável/i);
    }
  });
});
