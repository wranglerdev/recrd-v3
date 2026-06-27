import { describe, expect, it } from "vitest";
import {
  captureClick,
  captureInput,
  captureKeyPress,
  captureNavigate,
  inspectElement,
  massVariableValue,
  massVariableReference,
} from "@domain/capture/capture";
import type { ElementDescriptor } from "@domain/selectors/element-descriptor";

function el(overrides: Partial<ElementDescriptor>): ElementDescriptor {
  return { tag: "div", attributes: {}, ...overrides };
}

describe("capture (PRD §10, §12)", () => {
  it("captures a click using the best selector", () => {
    expect(captureClick(el({ attributes: { "data-testid": "login" } }))).toEqual({
      type: "click",
      selector: '[data-testid="login"]',
    });
  });

  it("captures input with a literal or variable value", () => {
    expect(captureInput(el({ attributes: { id: "email" } }), "a@b.com")).toEqual({
      type: "input",
      selector: "#email",
      value: "a@b.com",
    });
    expect(captureInput(el({ attributes: { id: "u" } }), massVariableValue("usuario"))).toEqual({
      type: "input",
      selector: "#u",
      value: "{{usuario}}",
    });
  });

  it("captures navigation", () => {
    expect(captureNavigate("https://example.com")).toEqual({
      type: "navigate",
      url: "https://example.com",
    });
  });

  it("captures a key press using the best selector", () => {
    expect(captureKeyPress(el({ attributes: { "data-testid": "search" } }), "Enter")).toEqual({
      type: "pressKey",
      selector: '[data-testid="search"]',
      key: "Enter",
    });
  });
});

describe("massVariableReference (PRD §12)", () => {
  it("normalises a dragged mass-column payload to its reference", () => {
    expect(massVariableReference("{{usuario}}")).toBe("{{usuario}}");
    expect(massVariableReference("  {{ senha }}  ")).toBe("{{senha}}");
  });

  it("rejects text that is not a single variable reference", () => {
    expect(massVariableReference("usuario")).toBeNull();
    expect(massVariableReference("")).toBeNull();
    expect(massVariableReference("ola {{nome}}")).toBeNull();
    expect(massVariableReference("{{a}}{{b}}")).toBeNull();
    expect(massVariableReference("{{}}")).toBeNull();
  });
});

describe("inspectElement (PRD §10 Inspect mode)", () => {
  it("summarises tag, id, classes, xpath and ranked selectors", () => {
    const inspection = inspectElement(
      el({
        tag: "input",
        attributes: { id: "login", class: "form-control  is-valid" },
        xpath: "//input[@id='login']",
      }),
    );
    expect(inspection.tag).toBe("input");
    expect(inspection.id).toBe("login");
    expect(inspection.classes).toEqual(["form-control", "is-valid"]);
    expect(inspection.xpath).toBe("//input[@id='login']");
    // id-anchored: #login is the top-ranked candidate, xpath also offered.
    expect(inspection.selectors[0]).toEqual({
      strategy: "id",
      value: "#login",
      confidence: "high",
      stable: true,
    });
    expect(inspection.selectors.some((s) => s.strategy === "xpath")).toBe(true);
  });

  it("handles missing id/class/xpath", () => {
    expect(inspectElement(el({ tag: "span" }))).toEqual({
      tag: "span",
      id: null,
      classes: [],
      xpath: null,
      selectors: [],
    });
  });
});
