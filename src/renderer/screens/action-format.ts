import type { ScriptActionDto } from "../../shared/ipc-contract.js";

// Presentation helpers for recorded script actions (PRD §10, §13): a human label
// for the timeline and access to each action's primary editable text field, so
// the editable timeline can render and patch actions without duplicating the
// discriminated-union switch.

/** A short, human-readable description of an action for the timeline. */
export function describeAction(action: ScriptActionDto): string {
  switch (action.type) {
    case "navigate":
      return `Navegar → ${action.url}`;
    case "click":
      return `Clicar em ${action.selector}`;
    case "input":
      return `Preencher ${action.selector} com "${action.value}"`;
    case "pressKey":
      return `Tecla ${action.key} em ${action.selector}`;
    case "wait":
      return `Aguardar ${action.selector}`;
    case "assertText":
      return `Verificar "${action.text}" em ${action.selector}`;
  }
}

/** The action's primary editable text field, or null when it has none. */
export function editableField(
  action: ScriptActionDto,
): { readonly label: string; readonly value: string } | null {
  switch (action.type) {
    case "navigate":
      return { label: "URL", value: action.url };
    case "input":
      return { label: "Valor", value: action.value };
    case "pressKey":
      return { label: "Tecla", value: action.key };
    case "assertText":
      return { label: "Texto", value: action.text };
    case "click":
    case "wait":
      return null;
  }
}

/** The element selector an action targets, or null for selector-less actions. */
export function actionSelector(action: ScriptActionDto): string | null {
  return action.type === "navigate" ? null : action.selector;
}

/** Returns a copy of `action` with its element selector set to `selector`. */
export function withSelector(action: ScriptActionDto, selector: string): ScriptActionDto {
  return action.type === "navigate" ? action : { ...action, selector };
}

/** Returns a copy of `action` with its primary editable field set to `value`. */
export function withEditableValue(action: ScriptActionDto, value: string): ScriptActionDto {
  switch (action.type) {
    case "navigate":
      return { ...action, url: value };
    case "input":
      return { ...action, value };
    case "pressKey":
      return { ...action, key: value };
    case "assertText":
      return { ...action, text: value };
    case "click":
    case "wait":
      return action;
  }
}
