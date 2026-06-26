import { ipcRenderer } from "electron";
import {
  captureClick,
  captureInput,
  captureKeyPress,
  captureNavigate,
} from "../domain/capture/capture.js";
import type { ElementDescriptor } from "../domain/selectors/element-descriptor.js";
import { generateSelectors } from "../domain/selectors/selector-generator.js";
import type { ScriptAction } from "../domain/scripts/script-action.js";
import { describeElement, isSignificantKey, keyName } from "./sandbox/dom-descriptor.js";

// Browser Sandbox content-script (PRD §10). Injected into the isolated
// BrowserView, it listens for the user's interactions, maps each to a recorded
// script action via the platform-agnostic capture domain, and forwards them to
// the main process over `capture:action` (main relays them to the renderer's
// recording session). Electron + DOM glue — exercised by E2E, excluded from the
// unit gate; its pure pieces live in ./sandbox/dom-descriptor (unit-tested).

function send(action: ScriptAction, descriptor?: ElementDescriptor): void {
  const selectors = descriptor === undefined ? undefined : generateSelectors(descriptor);
  ipcRenderer.send("capture:action", { action, selectors });
}

function targetElement(event: Event): Element | null {
  const target = event.target;
  return target instanceof Element ? target : null;
}

window.addEventListener(
  "click",
  (event) => {
    const element = targetElement(event);
    if (element !== null) {
      const descriptor = describeElement(element);
      send(captureClick(descriptor), descriptor);
    }
  },
  true,
);

window.addEventListener(
  "change",
  (event) => {
    const element = targetElement(event);
    if (element !== null && "value" in element) {
      const descriptor = describeElement(element);
      send(captureInput(descriptor, String((element as HTMLInputElement).value)), descriptor);
    }
  },
  true,
);

window.addEventListener(
  "keydown",
  (event) => {
    const element = targetElement(event);
    if (element !== null && isSignificantKey(event)) {
      const descriptor = describeElement(element);
      send(captureKeyPress(descriptor, keyName(event)), descriptor);
    }
  },
  true,
);

// Record the initial page and any in-page navigation that changes the URL.
window.addEventListener("DOMContentLoaded", () => {
  send(captureNavigate(window.location.href));
});
