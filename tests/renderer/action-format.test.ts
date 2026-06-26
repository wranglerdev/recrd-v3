import { describe, expect, it } from "vitest";
import {
  actionSelector,
  describeAction,
  editableField,
  withEditableValue,
  withSelector,
} from "@renderer/screens/action-format";
import type { ScriptActionDto } from "@shared/ipc-contract";

const ALL: ScriptActionDto[] = [
  { type: "navigate", url: "https://e.com" },
  { type: "click", selector: "#a" },
  { type: "input", selector: "#u", value: "v" },
  { type: "pressKey", selector: "#u", key: "Enter" },
  { type: "wait", selector: "#x" },
  { type: "assertText", selector: "#m", text: "ok" },
];

describe("describeAction", () => {
  it("labels every action type", () => {
    expect(ALL.map(describeAction)).toEqual([
      "Navegar → https://e.com",
      "Clicar em #a",
      'Preencher #u com "v"',
      "Tecla Enter em #u",
      "Aguardar #x",
      'Verificar "ok" em #m',
    ]);
  });
});

describe("editableField / withEditableValue", () => {
  it("exposes the primary field for editable actions and patches it", () => {
    expect(editableField({ type: "navigate", url: "a" })).toEqual({ label: "URL", value: "a" });
    expect(withEditableValue({ type: "navigate", url: "a" }, "b")).toEqual({
      type: "navigate",
      url: "b",
    });
    expect(withEditableValue({ type: "input", selector: "#u", value: "a" }, "b")).toEqual({
      type: "input",
      selector: "#u",
      value: "b",
    });
    expect(withEditableValue({ type: "pressKey", selector: "#u", key: "a" }, "Tab")).toEqual({
      type: "pressKey",
      selector: "#u",
      key: "Tab",
    });
    expect(withEditableValue({ type: "assertText", selector: "#m", text: "a" }, "b")).toEqual({
      type: "assertText",
      selector: "#m",
      text: "b",
    });
  });

  it("returns null and is a no-op for actions with no primary text", () => {
    const click: ScriptActionDto = { type: "click", selector: "#a" };
    const wait: ScriptActionDto = { type: "wait", selector: "#x" };
    expect(editableField(click)).toBeNull();
    expect(editableField(wait)).toBeNull();
    expect(withEditableValue(click, "x")).toBe(click);
    expect(withEditableValue(wait, "x")).toBe(wait);
  });
});

describe("actionSelector / withSelector", () => {
  it("reads and replaces the element selector for selector-based actions", () => {
    const click: ScriptActionDto = { type: "click", selector: "#a" };
    expect(actionSelector(click)).toBe("#a");
    expect(withSelector(click, "#b")).toEqual({ type: "click", selector: "#b" });
    expect(withSelector({ type: "input", selector: "#u", value: "v" }, "#x")).toEqual({
      type: "input",
      selector: "#x",
      value: "v",
    });
  });

  it("returns null / is a no-op for navigate (no element selector)", () => {
    const navigate: ScriptActionDto = { type: "navigate", url: "https://e.com" };
    expect(actionSelector(navigate)).toBeNull();
    expect(withSelector(navigate, "#x")).toBe(navigate);
  });
});
