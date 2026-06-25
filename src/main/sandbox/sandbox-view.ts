import { BrowserView } from "electron";
import { SANDBOX_WEB_PREFERENCES } from "./sandbox-config.js";

// Creates the isolated Browser Sandbox view (PRD §10). The recording
// content-script is injected via `preloadPath`; all security flags come from
// SANDBOX_WEB_PREFERENCES. Electron glue — covered by E2E, not the unit gate.
export function createSandboxView(preloadPath: string): BrowserView {
  return new BrowserView({
    webPreferences: { ...SANDBOX_WEB_PREFERENCES, preload: preloadPath },
  });
}
