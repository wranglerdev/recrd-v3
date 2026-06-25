import { describe, expect, it } from "vitest";
import type { ElementDescriptor } from "@domain/selectors/element-descriptor";
import {
  bestSelector,
  generateSelectors,
  unstableSelectorWarning,
} from "@domain/selectors/selector-generator";

function el(overrides: Partial<ElementDescriptor>): ElementDescriptor {
  return { tag: "div", attributes: {}, ...overrides };
}

describe("bestSelector priority (PRD §11)", () => {
  it("prefers data-testid over everything else", () => {
    const sel = bestSelector(
      el({ attributes: { "data-testid": "login", id: "x", name: "y", "aria-label": "z" } }),
    );
    expect(sel.strategy).toBe("data-testid");
    expect(sel.value).toBe('[data-testid="login"]');
    expect(sel.confidence).toBe("high");
  });

  it("falls back through aria-label, id, name, role, text in order", () => {
    expect(bestSelector(el({ attributes: { "aria-label": "Entrar", id: "i" } })).strategy).toBe(
      "aria-label",
    );
    expect(bestSelector(el({ attributes: { id: "user", name: "n" } })).strategy).toBe("id");
    expect(bestSelector(el({ attributes: { name: "email", role: "textbox" } })).strategy).toBe(
      "name",
    );
    expect(bestSelector(el({ attributes: { role: "button" } })).strategy).toBe("role");
    expect(bestSelector(el({ tag: "button", attributes: {}, text: "Salvar" })).strategy).toBe(
      "text",
    );
  });

  it("uses a stable CSS path when present and not positional", () => {
    const sel = bestSelector(el({ cssPath: "form > button.primary" }));
    expect(sel.strategy).toBe("css");
    expect(sel.confidence).toBe("high");
    expect(sel.stable).toBe(true);
  });

  it("flags a positional CSS path as low confidence", () => {
    const sel = bestSelector(el({ cssPath: "div:nth-child(5)" }));
    expect(sel.strategy).toBe("css");
    expect(sel.confidence).toBe("low");
    expect(sel.stable).toBe(false);
  });

  it("falls back to the tag selector when nothing else is available", () => {
    const sel = bestSelector(el({ tag: "section", attributes: {} }));
    expect(sel.strategy).toBe("css");
    expect(sel.value).toBe("section");
  });
});

describe("selector value formatting", () => {
  it("uses #id for simple ids and an attribute selector for complex ones", () => {
    expect(bestSelector(el({ attributes: { id: "login-btn" } })).value).toBe("#login-btn");
    expect(bestSelector(el({ attributes: { id: "a b" } })).value).toBe('[id="a b"]');
  });

  it("escapes quotes in attribute values", () => {
    expect(bestSelector(el({ attributes: { "aria-label": 'say "hi"' } })).value).toBe(
      '[aria-label="say \\"hi\\""]',
    );
  });

  it("builds a relative text selector and never an absolute xpath", () => {
    const selectors = generateSelectors(el({ tag: "button", attributes: {}, text: "Salvar" }));
    expect(selectors.some((s) => s.strategy === "text")).toBe(true);
    const withAbsoluteXpath = generateSelectors(el({ xpath: "/html/body/div/button" }));
    expect(withAbsoluteXpath.some((s) => s.strategy === "xpath")).toBe(false);
  });

  it("includes a relative xpath as a candidate", () => {
    const selectors = generateSelectors(el({ xpath: "//button[@type='submit']" }));
    expect(selectors.some((s) => s.strategy === "xpath")).toBe(true);
  });
});

describe("generateSelectors ordering", () => {
  it("returns all applicable candidates in priority order", () => {
    const selectors = generateSelectors(
      el({
        attributes: { "data-testid": "t", id: "i" },
        text: "Hi",
        cssPath: "form button",
      }),
    );
    expect(selectors.map((s) => s.strategy)).toEqual(["data-testid", "id", "text", "css"]);
  });
});

describe("unstableSelectorWarning (PRD §11)", () => {
  it("warns for low-confidence selectors", () => {
    const sel = bestSelector(el({ cssPath: "div:nth-child(5)" }));
    expect(unstableSelectorWarning(sel)).toMatch(/seletor instável/i);
  });

  it("returns null for high-confidence selectors", () => {
    const sel = bestSelector(el({ attributes: { "data-testid": "x" } }));
    expect(unstableSelectorWarning(sel)).toBeNull();
  });
});
