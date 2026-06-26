// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  cssPath,
  describeElement,
  isSignificantKey,
  keyName,
} from "../../src/preload/sandbox/dom-descriptor";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("describeElement (PRD §10, §11)", () => {
  it("snapshots tag, attributes and short visible text", () => {
    document.body.innerHTML = `<button id="login" data-testid="go" class="btn primary">Entrar</button>`;
    const element = document.querySelector("button")!;

    const descriptor = describeElement(element);
    expect(descriptor.tag).toBe("button");
    expect(descriptor.attributes).toEqual({
      id: "login",
      "data-testid": "go",
      class: "btn primary",
    });
    expect(descriptor.text).toBe("Entrar");
  });

  it("omits empty or overly long text", () => {
    document.body.innerHTML = `<div>${"x".repeat(200)}</div><span></span>`;
    expect(describeElement(document.querySelector("div")!).text).toBeUndefined();
    expect(describeElement(document.querySelector("span")!).text).toBeUndefined();
  });

  it("collapses whitespace in captured text", () => {
    document.body.innerHTML = `<p>  Olá   mundo  </p>`;
    expect(describeElement(document.querySelector("p")!).text).toBe("Olá mundo");
  });
});

describe("cssPath", () => {
  it("builds a positional path using nth-of-type for ambiguous siblings", () => {
    document.body.innerHTML = `<ul><li>a</li><li><a href="#">b</a></li></ul>`;
    const link = document.querySelector("a")!;
    expect(cssPath(link)).toBe("body > ul > li:nth-of-type(2) > a");
  });

  it("omits the index for unique siblings", () => {
    document.body.innerHTML = `<section><form><input /></form></section>`;
    expect(cssPath(document.querySelector("input")!)).toBe("body > section > form > input");
  });
});

describe("isSignificantKey / keyName", () => {
  const base = { key: "a", ctrlKey: false, metaKey: false, altKey: false };

  it("records navigation/edit keys without modifiers", () => {
    expect(isSignificantKey({ ...base, key: "Enter" })).toBe(true);
    expect(isSignificantKey({ ...base, key: "ArrowDown" })).toBe(true);
    expect(isSignificantKey({ ...base, key: "a" })).toBe(false);
  });

  it("records any key pressed with a modifier, but not the modifier alone", () => {
    expect(isSignificantKey({ ...base, key: "a", ctrlKey: true })).toBe(true);
    expect(isSignificantKey({ ...base, key: "Control", ctrlKey: true })).toBe(false);
  });

  it("prefixes active modifiers in the key name", () => {
    expect(keyName({ ...base, key: "a", ctrlKey: true })).toBe("Control+a");
    expect(keyName({ ...base, key: "Enter" })).toBe("Enter");
    expect(keyName({ ...base, key: "x", ctrlKey: true, metaKey: true, altKey: true })).toBe(
      "Control+Meta+Alt+x",
    );
  });
});
