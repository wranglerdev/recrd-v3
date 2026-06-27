import type { ElementDescriptor } from "../../domain/selectors/element-descriptor.js";

// DOM → ElementDescriptor extraction for the Browser Sandbox content-script
// (PRD §10, §11). Lives in the preload layer because it touches DOM types; the
// resulting descriptor is plain data handed to the platform-agnostic selector
// generator. Kept side-effect-free so it can be unit-tested under jsdom.

const MAX_TEXT_LENGTH = 80;

/** Builds a positional CSS path from `element` up to (but excluding) <html>. */
export function cssPath(element: Element): string {
  const parts: string[] = [];
  let node: Element | null = element;
  while (node !== null && node.tagName.toLowerCase() !== "html") {
    let selector = node.tagName.toLowerCase();
    const parent = node.parentElement;
    if (parent !== null) {
      const sameTag = Array.from(parent.children).filter(
        (child) => child.tagName === node!.tagName,
      );
      if (sameTag.length > 1) {
        selector += `:nth-of-type(${sameTag.indexOf(node) + 1})`;
      }
    }
    parts.unshift(selector);
    node = node.parentElement;
  }
  return parts.join(" > ");
}

/**
 * Builds a relative XPath for `element`, preferring an `id` anchor
 * (`//*[@id="…"]`) and otherwise a positional path from the nearest ancestor.
 * Stays relative (leading `//`) so the selector generator accepts it (PRD §11).
 */
export function xpath(element: Element): string {
  const id = element.getAttribute("id");
  if (id !== null && id.length > 0) {
    return `//*[@id="${id}"]`;
  }
  const parts: string[] = [];
  let node: Element | null = element;
  while (node !== null && node.tagName.toLowerCase() !== "html") {
    const tag = node.tagName.toLowerCase();
    const parent = node.parentElement;
    let step = tag;
    if (parent !== null) {
      const sameTag = Array.from(parent.children).filter(
        (child) => child.tagName === node!.tagName,
      );
      if (sameTag.length > 1) {
        step += `[${sameTag.indexOf(node) + 1}]`;
      }
    }
    parts.unshift(step);
    node = node.parentElement;
  }
  return `//${parts.join("/")}`;
}

/** Snapshots an element's tag, attributes, short visible text, CSS path and XPath. */
export function describeElement(element: Element): ElementDescriptor {
  const attributes: Record<string, string> = {};
  for (const attr of Array.from(element.attributes)) {
    attributes[attr.name] = attr.value;
  }
  const text = (element.textContent ?? "").replace(/\s+/g, " ").trim();
  const path = cssPath(element);
  return {
    tag: element.tagName.toLowerCase(),
    attributes,
    ...(text.length > 0 && text.length <= MAX_TEXT_LENGTH ? { text } : {}),
    ...(path.length > 0 ? { cssPath: path } : {}),
    xpath: xpath(element),
  };
}

// Keystrokes worth recording on their own. Printable characters are captured via
// the `input` event, so only navigation/edit keys (or any key pressed with a
// modifier) become an explicit `pressKey` action.
const SIGNIFICANT_KEYS = new Set([
  "Enter",
  "Tab",
  "Escape",
  "Backspace",
  "Delete",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

export interface KeyEventLike {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
}

/** Whether a keydown is worth recording as an explicit pressKey action. */
export function isSignificantKey(event: KeyEventLike): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return (
      event.key.length > 0 && event.key !== "Control" && event.key !== "Meta" && event.key !== "Alt"
    );
  }
  return SIGNIFICANT_KEYS.has(event.key);
}

/** The Playwright-style key name, prefixing active modifiers (e.g. "Control+A"). */
export function keyName(event: KeyEventLike): string {
  const modifiers: string[] = [];
  if (event.ctrlKey) modifiers.push("Control");
  if (event.metaKey) modifiers.push("Meta");
  if (event.altKey) modifiers.push("Alt");
  return [...modifiers, event.key].join("+");
}
