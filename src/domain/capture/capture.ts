import type { ElementDescriptor } from "../selectors/element-descriptor.js";
import { bestSelector } from "../selectors/selector-generator.js";
import type { ScriptAction } from "../scripts/script-action.js";

// Pure mapping from captured browser interactions to script actions (PRD §10).
// The Browser Sandbox content-script gathers raw DOM data; this turns it into the
// recorded intent using the intelligent selector generator.

/** A click on an element. */
export function captureClick(element: ElementDescriptor): ScriptAction {
  return { type: "click", selector: bestSelector(element).value };
}

/** Text entry into a field. `value` may already be a `{{variable}}` reference. */
export function captureInput(element: ElementDescriptor, value: string): ScriptAction {
  return { type: "input", selector: bestSelector(element).value, value };
}

/** A navigation to a URL. */
export function captureNavigate(url: string): ScriptAction {
  return { type: "navigate", url };
}

/**
 * A keyboard interaction on an element (PRD §10 "Captura de teclado"). `key`
 * is a Playwright/Browser key name such as "Enter", "Tab" or "Control+A".
 */
export function captureKeyPress(element: ElementDescriptor, key: string): ScriptAction {
  return { type: "pressKey", selector: bestSelector(element).value, key };
}

/**
 * Value stored when a mass variable is dragged onto a field (PRD §12): the
 * literal value is replaced by a `{{variable}}` reference.
 */
export function massVariableValue(variable: string): string {
  return `{{${variable}}}`;
}

export type ElementInspection = {
  readonly tag: string;
  readonly id: string | null;
  readonly classes: readonly string[];
  readonly xpath: string | null;
};

/** Inspect-mode summary shown on hover (PRD §10). */
export function inspectElement(element: ElementDescriptor): ElementInspection {
  const id = element.attributes["id"];
  const classAttr = element.attributes["class"];
  const classes = classAttr === undefined ? [] : classAttr.split(/\s+/).filter((c) => c.length > 0);
  return {
    tag: element.tag,
    id: id ?? null,
    classes,
    xpath: element.xpath ?? null,
  };
}
