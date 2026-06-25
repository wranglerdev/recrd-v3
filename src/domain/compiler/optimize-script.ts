import type { ManualScript, ScriptAction } from "../scripts/script-action.js";

// Optimizes a manual script before code generation (PRD §13): drops consecutive
// duplicate actions and collapses consecutive navigations (only the final
// destination matters). Pure and order-preserving otherwise.

function actionsEqual(a: ScriptAction, b: ScriptAction): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function optimizeScript(script: ManualScript): ManualScript {
  const actions: ScriptAction[] = [];

  for (const action of script.actions) {
    const previous = actions[actions.length - 1];
    if (previous !== undefined && actionsEqual(previous, action)) {
      continue;
    }
    if (previous !== undefined && previous.type === "navigate" && action.type === "navigate") {
      actions[actions.length - 1] = action;
      continue;
    }
    actions.push(action);
  }

  return { name: script.name, actions };
}
