import type { ElementDescriptor } from "./element-descriptor.js";
import { generateSelectors, type GeneratedSelector } from "./selector-generator.js";

// Inspect-mode element detail (PRD §10, §11). The Browser Sandbox content-script
// snapshots a hovered element into an {@link ElementDescriptor}; this pure
// derivation turns it into the human-facing breakdown the Element Inspector panel
// shows: tag, id, classes, the relative XPath (if any) and the ranked selector
// candidates. No DOM types, so it lives in the domain and is fully unit-testable.

export interface InspectedElement {
  readonly tag: string;
  /** The element's `id`, or null when it has none. */
  readonly id: string | null;
  /** The individual class names (whitespace-split), empty when unclassed. */
  readonly classes: readonly string[];
  /** The relative XPath snapshotted by the content-script, or null. */
  readonly xpath: string | null;
  /** Ranked selector candidates, most-preferred first (PRD §11). */
  readonly selectors: readonly GeneratedSelector[];
}

/** Derives the inspect-mode detail for a snapshotted element descriptor. */
export function inspectElement(descriptor: ElementDescriptor): InspectedElement {
  const id = descriptor.attributes["id"] ?? null;
  const classAttr = descriptor.attributes["class"] ?? "";
  const classes = classAttr.split(/\s+/).filter((name) => name.length > 0);
  return {
    tag: descriptor.tag,
    id,
    classes,
    xpath: descriptor.xpath ?? null,
    selectors: generateSelectors(descriptor),
  };
}
