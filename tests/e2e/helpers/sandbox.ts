import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { ElectronApplication } from "@playwright/test";

// Sandbox fixture + deterministic capture helpers for E2E (electron-bzv.2). The
// recording flow captures DOM events from the page loaded in the isolated
// BrowserView via the sandbox content-script (capture:action). Playwright cannot
// reliably drive a BrowserView as a Page, so these helpers load a static local
// fixture into the view and synthesise interactions inside the view's webContents
// via app.evaluate -> executeJavaScript. The real content-script listeners then
// map each event to a recorded action and relay it to the renderer's recording
// session, exactly as a manual interaction would.

const here = dirname(fileURLToPath(import.meta.url));

/** Absolute file:// URL of the deterministic sandbox fixture page. */
export function fixtureUrl(): string {
  return pathToFileURL(join(here, "..", "fixtures", "sandbox-page.html")).href;
}

/** Runs code inside the sandbox BrowserView's page, returning its result. */
async function inSandbox<T>(app: ElectronApplication, expression: string): Promise<T> {
  return app.evaluate(async ({ BrowserWindow }, code): Promise<T> => {
    const [window] = BrowserWindow.getAllWindows();
    if (window === undefined) {
      throw new Error("No BrowserWindow open");
    }
    const [view] = window.getBrowserViews();
    if (view === undefined) {
      throw new Error("Sandbox BrowserView is not attached");
    }
    return view.webContents.executeJavaScript(code) as Promise<T>;
  }, expression);
}

/**
 * True once the sandbox BrowserView is attached to the window. It is added only
 * when the Automation screen reports a viewport rect (setSandboxVisible), so flow
 * suites poll this after navigating there before driving the fixture.
 */
export async function isSandboxAttached(app: ElectronApplication): Promise<boolean> {
  return app.evaluate(({ BrowserWindow }) => {
    const [window] = BrowserWindow.getAllWindows();
    return window !== undefined && window.getBrowserViews().length > 0;
  });
}

/** Loads the fixture into the sandbox view and waits for it to be interactive. */
export async function loadFixture(app: ElectronApplication, url = fixtureUrl()): Promise<void> {
  await app.evaluate(async ({ BrowserWindow }, target) => {
    const [window] = BrowserWindow.getAllWindows();
    if (window === undefined) {
      throw new Error("No BrowserWindow open");
    }
    const [view] = window.getBrowserViews();
    if (view === undefined) {
      throw new Error("Sandbox BrowserView is not attached");
    }
    await view.webContents.loadURL(target);
  }, url);
}

/** Clicks an element in the fixture by CSS selector (drives the real capture). */
export async function clickInSandbox(app: ElectronApplication, selector: string): Promise<void> {
  await inSandbox(app, `document.querySelector(${JSON.stringify(selector)}).click(); undefined;`);
}

/** Sets an input's value and fires a `change` event so the content-script records it. */
export async function fillInSandbox(
  app: ElectronApplication,
  selector: string,
  value: string,
): Promise<void> {
  const sel = JSON.stringify(selector);
  const val = JSON.stringify(value);
  await inSandbox(
    app,
    `(() => {
      const el = document.querySelector(${sel});
      el.value = ${val};
      el.dispatchEvent(new Event("change", { bubbles: true }));
    })(); undefined;`,
  );
}

/** Hovers an element (fires a `mousemove`) so Inspect mode snapshots it. */
export async function hoverInSandbox(app: ElectronApplication, selector: string): Promise<void> {
  const sel = JSON.stringify(selector);
  await inSandbox(
    app,
    `(() => {
      const el = document.querySelector(${sel});
      el.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
    })(); undefined;`,
  );
}

/** Reads an element's text content from the fixture (for assert-text checks). */
export async function readSandboxText(app: ElectronApplication, selector: string): Promise<string> {
  return inSandbox<string>(
    app,
    `document.querySelector(${JSON.stringify(selector)}).textContent ?? "";`,
  );
}
