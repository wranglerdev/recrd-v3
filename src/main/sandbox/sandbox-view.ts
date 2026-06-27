import { BrowserView, type BrowserWindow } from "electron";
import type { SandboxViewPort } from "../../application/sandbox/sandbox-controller.js";
import { SANDBOX_WEB_PREFERENCES } from "./sandbox-config.js";

// Creates the isolated Browser Sandbox view (PRD §10). The recording
// content-script is injected via `preloadPath`; all security flags come from
// SANDBOX_WEB_PREFERENCES. Electron glue — covered by E2E, not the unit gate.
export function createSandboxView(preloadPath: string): BrowserView {
  return new BrowserView({
    webPreferences: { ...SANDBOX_WEB_PREFERENCES, preload: preloadPath },
  });
}

/**
 * Adapts a BrowserView + host window to the application's {@link SandboxViewPort}
 * (PRD §10). `setVisible` adds/removes the view from the window so a hidden
 * sandbox releases the layout; bounds and navigation forward straight to the
 * view. Electron glue — exercised by E2E, excluded from the unit gate.
 */
export function createSandboxViewPort(window: BrowserWindow, view: BrowserView): SandboxViewPort {
  let attached = false;
  return {
    setVisible(visible) {
      if (visible && !attached) {
        window.addBrowserView(view);
        attached = true;
      } else if (!visible && attached) {
        window.removeBrowserView(view);
        attached = false;
      }
    },
    setBounds(rect) {
      view.setBounds(rect);
    },
    loadUrl(url) {
      void view.webContents.loadURL(url);
    },
    goBack() {
      view.webContents.navigationHistory.goBack();
    },
    goForward() {
      view.webContents.navigationHistory.goForward();
    },
    reload() {
      view.webContents.reload();
    },
    setInspect(enabled) {
      // Tell the injected content-script to toggle the hover overlay (PRD §10).
      view.webContents.send("inspect:set", enabled);
    },
  };
}
