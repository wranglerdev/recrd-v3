import { describe, expect, it } from "vitest";
import type { ManualScript, ScriptAction } from "@domain/scripts/script-action";
import { validateScript } from "@domain/scripts/validate-script";

function script(actions: ScriptAction[], name = "Login"): ManualScript {
  return { name, actions };
}

describe("validateScript (PRD §13)", () => {
  it("accepts a well-formed script", () => {
    const result = validateScript(
      script([
        { type: "navigate", url: "https://example.com" },
        { type: "click", selector: "#login" },
        { type: "input", selector: "#email", value: "{{usuario}}" },
        { type: "wait", selector: "#dashboard" },
        { type: "assertText", selector: "#welcome", text: "Bem-vindo" },
      ]),
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects an empty name and empty action list", () => {
    const result = validateScript(script([], "  "));
    const messages = result.errors.map((e) => e.message);
    expect(result.valid).toBe(false);
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/name/i),
        expect.stringMatching(/at least one/i),
      ]),
    );
  });

  it("flags a blank selector with its action index", () => {
    const result = validateScript(script([{ type: "click", selector: "   " }]));
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toEqual({ index: 0, message: expect.stringMatching(/selector/i) });
  });

  it("requires a scheme on navigate URLs", () => {
    const result = validateScript(script([{ type: "navigate", url: "example.com" }]));
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.message).toMatch(/url/i);
  });

  it("requires assertion text", () => {
    const result = validateScript(script([{ type: "assertText", selector: "#x", text: "" }]));
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.message).toMatch(/text/i);
  });

  it("allows an empty input value (clearing a field)", () => {
    const result = validateScript(script([{ type: "input", selector: "#x", value: "" }]));
    expect(result.valid).toBe(true);
  });
});
