import type { ElementDescriptor } from "./element-descriptor.js";
import { isAbsoluteXpath, isStableCss } from "./selector-stability.js";

// Intelligent selector generation (PRD §11). Candidates are produced in strict
// priority order: data-testid > aria-label > id > name > role > visible text >
// stable CSS > relative XPath. Absolute XPath is never produced.

export type SelectorStrategy =
  | "data-testid"
  | "aria-label"
  | "id"
  | "name"
  | "role"
  | "text"
  | "css"
  | "xpath";

export type SelectorConfidence = "high" | "low";

export type GeneratedSelector = {
  readonly strategy: SelectorStrategy;
  readonly value: string;
  readonly confidence: SelectorConfidence;
  readonly stable: boolean;
};

const UNSTABLE_WARNING = "⚠ Elemento com seletor instável. Escolha um seletor alternativo.";
const SIMPLE_ID = /^[A-Za-z_][\w-]*$/;

function escapeQuotes(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function attributeSelector(name: string, value: string): string {
  return `[${name}="${escapeQuotes(value)}"]`;
}

function high(strategy: SelectorStrategy, value: string): GeneratedSelector {
  return { strategy, value, confidence: "high", stable: true };
}

/** All applicable selector candidates, most-preferred first (PRD §11). */
export function generateSelectors(element: ElementDescriptor): GeneratedSelector[] {
  const out: GeneratedSelector[] = [];
  const attrs = element.attributes;

  const testId = attrs["data-testid"];
  if (testId !== undefined) {
    out.push(high("data-testid", attributeSelector("data-testid", testId)));
  }
  const ariaLabel = attrs["aria-label"];
  if (ariaLabel !== undefined) {
    out.push(high("aria-label", attributeSelector("aria-label", ariaLabel)));
  }
  const id = attrs["id"];
  if (id !== undefined) {
    out.push(high("id", SIMPLE_ID.test(id) ? `#${id}` : attributeSelector("id", id)));
  }
  const name = attrs["name"];
  if (name !== undefined) {
    out.push(high("name", attributeSelector("name", name)));
  }
  const role = attrs["role"];
  if (role !== undefined) {
    out.push(high("role", attributeSelector("role", role)));
  }
  if (element.text !== undefined && element.text.length > 0) {
    out.push(high("text", `${element.tag} >> text="${escapeQuotes(element.text)}"`));
  }
  if (element.cssPath !== undefined && element.cssPath.length > 0) {
    const stable = isStableCss(element.cssPath);
    out.push({
      strategy: "css",
      value: element.cssPath,
      confidence: stable ? "high" : "low",
      stable,
    });
  }
  if (element.xpath !== undefined && element.xpath.length > 0 && !isAbsoluteXpath(element.xpath)) {
    out.push(high("xpath", `xpath=${element.xpath}`));
  }

  return out;
}

/**
 * The single best selector for an element. Falls back to the bare tag selector
 * (low confidence) when no better candidate exists.
 */
export function bestSelector(element: ElementDescriptor): GeneratedSelector {
  const candidates = generateSelectors(element);
  const first = candidates[0];
  if (first !== undefined) {
    return first;
  }
  return { strategy: "css", value: element.tag, confidence: "low", stable: false };
}

/** A user-facing warning when the selector is low-confidence; null otherwise (PRD §11). */
export function unstableSelectorWarning(selector: GeneratedSelector): string | null {
  return selector.confidence === "low" ? UNSTABLE_WARNING : null;
}
