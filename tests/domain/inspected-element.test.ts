import { describe, expect, it } from "vitest";
import type { ElementDescriptor } from "@domain/selectors/element-descriptor";
import { inspectElement } from "@domain/selectors/inspected-element";

function el(overrides: Partial<ElementDescriptor>): ElementDescriptor {
  return { tag: "div", attributes: {}, ...overrides };
}

describe("inspectElement (PRD §10, §11)", () => {
  it("breaks out tag, id, classes and ranked selectors", () => {
    const detail = inspectElement(
      el({
        tag: "button",
        attributes: { id: "login", class: "btn primary", "data-testid": "go" },
      }),
    );
    expect(detail.tag).toBe("button");
    expect(detail.id).toBe("login");
    expect(detail.classes).toEqual(["btn", "primary"]);
    expect(detail.selectors[0]?.strategy).toBe("data-testid");
  });

  it("reports a null id and empty classes when absent", () => {
    const detail = inspectElement(el({ tag: "section", attributes: {} }));
    expect(detail.id).toBeNull();
    expect(detail.classes).toEqual([]);
    expect(detail.xpath).toBeNull();
  });

  it("collapses whitespace when splitting class names", () => {
    const detail = inspectElement(el({ attributes: { class: "  a   b  " } }));
    expect(detail.classes).toEqual(["a", "b"]);
  });

  it("carries through a relative xpath when present", () => {
    const detail = inspectElement(el({ xpath: "//button[@type='submit']" }));
    expect(detail.xpath).toBe("//button[@type='submit']");
  });
});
