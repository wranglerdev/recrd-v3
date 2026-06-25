// Security configuration for the Browser Sandbox BrowserView (PRD §10, §18).
// The sandbox loads remote content but stays isolated: no Node, context
// isolation on, OS sandbox on, web security on. The recording content-script is
// injected via a dedicated preload.

export type SandboxWebPreferences = {
  readonly contextIsolation: true;
  readonly nodeIntegration: false;
  readonly sandbox: true;
  readonly webSecurity: true;
};

export const SANDBOX_WEB_PREFERENCES: SandboxWebPreferences = {
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  webSecurity: true,
};
