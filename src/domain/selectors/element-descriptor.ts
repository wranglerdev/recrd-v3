// Snapshot of a captured DOM element, produced by the Browser Sandbox
// content-script and consumed by the selector generator (PRD §10, §11). Pure
// data — no DOM types — so selector logic stays in the platform-agnostic domain.
export type ElementDescriptor = {
  readonly tag: string;
  /** Element attributes, e.g. { "data-testid": "login", id: "user", role: "button" }. */
  readonly attributes: Readonly<Record<string, string>>;
  /** Trimmed visible text content, if any. */
  readonly text?: string;
  /** A CSS path computed by the content-script; may be positional/unstable. */
  readonly cssPath?: string;
  /** An XPath computed by the content-script; may be absolute (rejected). */
  readonly xpath?: string;
};
