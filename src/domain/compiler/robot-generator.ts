import type { ManualScript, ScriptAction } from "../scripts/script-action.js";

// Generates Robot Framework code using the Browser (Playwright) library from a
// manual script (PRD §13). Pure string transformation: {{var}} placeholders
// (PRD §12) become Robot ${var} references resolved from the test mass at runtime.

const INDENT = "    ";

/** Converts recorded `{{name}}` placeholders to Robot `${name}` syntax. */
function toRobotVariables(value: string): string {
  return value.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, "$${$1}");
}

function stepFor(action: ScriptAction): string {
  switch (action.type) {
    case "navigate":
      return `Go To${INDENT}${action.url}`;
    case "click":
      return `Click${INDENT}${action.selector}`;
    case "input":
      return `Fill Text${INDENT}${action.selector}${INDENT}${toRobotVariables(action.value)}`;
    case "pressKey":
      return `Press Keys${INDENT}${action.selector}${INDENT}${action.key}`;
    case "wait":
      return `Wait For Elements State${INDENT}${action.selector}${INDENT}visible`;
    case "assertText":
      return `Get Text${INDENT}${action.selector}${INDENT}==${INDENT}${toRobotVariables(action.text)}`;
  }
}

export function generateRobot(script: ManualScript): string {
  const steps = [
    `${INDENT}New Page`,
    ...script.actions.map((action) => `${INDENT}${stepFor(action)}`),
  ];
  const lines = [
    "*** Settings ***",
    "Library    Browser",
    "",
    "*** Test Cases ***",
    script.name,
    ...steps,
    "",
  ];
  return lines.join("\n");
}
