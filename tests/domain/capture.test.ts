import { describe, expect, it } from "vitest";
import {
  captureClick,
  captureInput,
  captureNavigate,
  inspectElement,
  massVariableValue,
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
});

describe("inspectElement (PRD §10 Inspect mode)", () => {
  it("summarises tag, id, classes and xpath", () => {
    const inspection = inspectElement(
      el({
        tag: "input",
        attributes: { id: "login", class: "form-control  is-valid" },
        xpath: "//input[@id='login']",
      }),
    );
    expect(inspection).toEqual({
      tag: "input",
      id: "login",
      classes: ["form-control", "is-valid"],
      xpath: "//input[@id='login']",
    });
  });

  it("handles missing id/class/xpath", () => {
    expect(inspectElement(el({ tag: "span" }))).toEqual({
      tag: "span",
      id: null,
      classes: [],
      xpath: null,
    });
  });
});
