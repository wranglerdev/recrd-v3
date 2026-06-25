import type { ManualScript, ScriptAction } from "./script-action.js";

// Validates a manual script before compilation (PRD §13). Errors are aggregated
// (not fail-fast) so the UI can show every problem at once. `index` is the
// action's position, or null for script-level issues.

export type ValidationIssue = {
  readonly index: number | null;
  readonly message: string;
};

export type ValidationResult = {
  readonly valid: boolean;
  readonly errors: readonly ValidationIssue[];
};

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

function validateAction(action: ScriptAction, index: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const requireSelector = (selector: string): void => {
    if (isBlank(selector)) {
      issues.push({ index, message: "Action selector must not be empty" });
    }
  };

  switch (action.type) {
    case "navigate":
      if (isBlank(action.url) || !action.url.includes("://")) {
        issues.push({ index, message: "Navigate url must be absolute (include a scheme)" });
      }
      break;
    case "click":
    case "wait":
      requireSelector(action.selector);
      break;
    case "input":
      requireSelector(action.selector);
      break;
    case "assertText":
      requireSelector(action.selector);
      if (isBlank(action.text)) {
        issues.push({ index, message: "Assertion text must not be empty" });
      }
      break;
  }
  return issues;
}

export function validateScript(scriptToValidate: ManualScript): ValidationResult {
  const errors: ValidationIssue[] = [];

  if (isBlank(scriptToValidate.name)) {
    errors.push({ index: null, message: "Script name must not be empty" });
  }
  if (scriptToValidate.actions.length === 0) {
    errors.push({ index: null, message: "Script must have at least one action" });
  }

  scriptToValidate.actions.forEach((action, index) => {
    errors.push(...validateAction(action, index));
  });

  return { valid: errors.length === 0, errors };
}
