// Stability heuristics for generated selectors (PRD §11). Positional CSS (e.g.
// div:nth-child(5)) and absolute XPath are brittle and must be flagged/avoided.

const POSITIONAL_CSS =
  /:nth-child|:nth-of-type|:nth-last-child|:nth-last-of-type|:first-child|:last-child/i;

/** True when a CSS path has no positional pseudo-classes. */
export function isStableCss(css: string): boolean {
  return !POSITIONAL_CSS.test(css);
}

/** True when an XPath is absolute (starts at the document root). */
export function isAbsoluteXpath(xpath: string): boolean {
  return xpath.startsWith("/") && !xpath.startsWith("//");
}
