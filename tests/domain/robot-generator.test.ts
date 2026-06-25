import { describe, expect, it } from "vitest";
import { generateRobot } from "@domain/compiler/robot-generator";
import type { ManualScript } from "@domain/scripts/script-action";

const script: ManualScript = {
  name: "Login Banco XYZ",
  actions: [
    { type: "navigate", url: "https://example.com" },
    { type: "click", selector: "#login" },
    { type: "input", selector: "#email", value: "{{usuario}}" },
    { type: "pressKey", selector: "#email", key: "Enter" },
    { type: "wait", selector: "#dashboard" },
    { type: "assertText", selector: "#welcome", text: "Bem-vindo {{usuario}}" },
  ],
};

describe("generateRobot (PRD §13)", () => {
  it("emits a Browser-library test case with mapped keywords", () => {
    const robot = generateRobot(script);

    expect(robot).toBe(
      [
        "*** Settings ***",
        "Library    Browser",
        "",
        "*** Test Cases ***",
        "Login Banco XYZ",
        "    New Page",
        "    Go To    https://example.com",
        "    Click    #login",
        "    Fill Text    #email    ${usuario}",
        "    Press Keys    #email    Enter",
        "    Wait For Elements State    #dashboard    visible",
        "    Get Text    #welcome    ==    Bem-vindo ${usuario}",
        "",
      ].join("\n"),
    );
  });

  it("converts {{var}} placeholders to Robot ${var} syntax", () => {
    const robot = generateRobot({
      name: "T",
      actions: [{ type: "input", selector: "#p", value: "{{senha}}" }],
    });
    expect(robot).toContain("Fill Text    #p    ${senha}");
  });
});
