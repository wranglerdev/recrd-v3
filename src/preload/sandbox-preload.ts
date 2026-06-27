import { ipcRenderer } from "electron";
import {
  captureClick,
  captureInput,
  captureKeyPress,
  captureNavigate,
  inspectElement,
  massVariableReference,
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

// Mass variable drag-and-drop (PRD §12). A column chip dragged from the Masses
// panel carries its `{{variable}}` reference as text/plain; dropping it onto a
// field records an `input` action with that reference instead of a literal value,
// so the compiled test reads the value from the mass at run time. `dragover` must
// preventDefault for the field to be a valid drop target.
window.addEventListener(
  "dragover",
  (event) => {
    const element = targetElement(event);
    if (element !== null && "value" in element && event.dataTransfer !== null) {
      event.dataTransfer.dropEffect = "copy";
      event.preventDefault();
    }
  },
  true,
);

window.addEventListener(
  "drop",
  (event) => {
    const element = targetElement(event);
    const text = event.dataTransfer?.getData("text/plain") ?? "";
    const reference = massVariableReference(text);
    if (element !== null && "value" in element && reference !== null) {
      event.preventDefault();
      (element as HTMLInputElement).value = reference;
      const descriptor = describeElement(element);
      send(captureInput(descriptor, reference), descriptor);
    }
  },
  true,
);

// --- Inspect mode (PRD §10) ------------------------------------------------
// When enabled (toggled by the main process over `inspect:set`), a hover draws a
// highlight overlay around the element under the cursor and streams its detail to
// the renderer's Element Inspector over `inspect:hover`. Pure DOM glue, so it is
// exercised by E2E rather than the unit gate; the detail derivation it relies on
// (inspectElement) is unit-tested in the domain.

let inspectEnabled = false;
let overlay: HTMLDivElement | null = null;

function ensureOverlay(): HTMLDivElement {
  if (overlay === null) {
    overlay = document.createElement("div");
    overlay.setAttribute("data-recrd-inspect-overlay", "");
    Object.assign(overlay.style, {
      position: "fixed",
      pointerEvents: "none",
      zIndex: "2147483647",
      border: "2px solid #2563eb",
      background: "rgba(37, 99, 235, 0.12)",
      borderRadius: "2px",
      transition: "all 40ms ease-out",
    });
    document.body.appendChild(overlay);
  }
  return overlay;
}

function clearOverlay(): void {
  overlay?.remove();
  overlay = null;
}

function highlight(element: Element): void {
  const rect = element.getBoundingClientRect();
  const box = ensureOverlay();
  Object.assign(box.style, {
    display: "block",
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });
}

function onInspectMove(event: MouseEvent): void {
  const element = targetElement(event);
  // Skip our own overlay so it never highlights itself.
  if (element === null || element === overlay) {
    return;
  }
  highlight(element);
  ipcRenderer.send("inspect:hover", inspectElement(describeElement(element)));
}

ipcRenderer.on("inspect:set", (_event, enabled: boolean) => {
  inspectEnabled = enabled;
  if (enabled) {
    window.addEventListener("mousemove", onInspectMove, true);
  } else {
    window.removeEventListener("mousemove", onInspectMove, true);
    clearOverlay();
  }
});

// Drop the overlay across navigations so a stale highlight never lingers.
window.addEventListener("beforeunload", () => {
  if (inspectEnabled) {
    clearOverlay();
  }
});
