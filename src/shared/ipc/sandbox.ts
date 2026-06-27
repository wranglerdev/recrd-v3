import { defineChannelNames, type Invoke } from "./core.js";

// `sandbox:*` feature contract — driving the embedded Browser Sandbox view from
// the renderer (PRD §10). The renderer owns the layout, so it tells the main
// process where to position the view, whether it is shown and what URL to load.
// Plain serialisable wire types; the main process holds the BrowserView.

export interface OpenSandboxRequest {
  /** Absolute http(s) URL to load into the sandbox. */
  readonly url: string;
}

/** Pixel bounds for the sandbox view, relative to the window content area. */
export interface SandboxBoundsRequest {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface SetSandboxVisibleRequest {
  readonly visible: boolean;
}

/** Toggles Inspect mode (hover overlay + Element Inspector feed) (PRD §10). */
export interface SetSandboxInspectRequest {
  readonly enabled: boolean;
}

export type SandboxChannels = {
  "sandbox:open": { request: OpenSandboxRequest; response: void };
  "sandbox:setBounds": { request: SandboxBoundsRequest; response: void };
  "sandbox:setVisible": { request: SetSandboxVisibleRequest; response: void };
  "sandbox:setInspect": { request: SetSandboxInspectRequest; response: void };
  "sandbox:back": { request: void; response: void };
  "sandbox:forward": { request: void; response: void };
  "sandbox:reload": { request: void; response: void };
};

export const SANDBOX_CHANNELS = defineChannelNames<
  SandboxChannels,
  [
    "sandbox:open",
    "sandbox:setBounds",
    "sandbox:setVisible",
    "sandbox:setInspect",
    "sandbox:back",
    "sandbox:forward",
    "sandbox:reload",
  ]
>([
  "sandbox:open",
  "sandbox:setBounds",
  "sandbox:setVisible",
  "sandbox:setInspect",
  "sandbox:back",
  "sandbox:forward",
  "sandbox:reload",
]);

/** The slice of the renderer API served by the sandbox feature. */
export interface SandboxApi {
  /** Loads an http(s) URL into the sandbox and shows it. */
  openSandbox(request: OpenSandboxRequest): Promise<void>;
  /** Positions the sandbox view to match the renderer layout. */
  setSandboxBounds(request: SandboxBoundsRequest): Promise<void>;
  /** Shows or hides the sandbox view. */
  setSandboxVisible(request: SetSandboxVisibleRequest): Promise<void>;
  /** Enables or disables Inspect mode in the sandbox (hover overlay). */
  setSandboxInspect(request: SetSandboxInspectRequest): Promise<void>;
  /** Navigates the sandbox back in its history. */
  sandboxBack(): Promise<void>;
  /** Navigates the sandbox forward in its history. */
  sandboxForward(): Promise<void>;
  /** Reloads the current sandbox page. */
  sandboxReload(): Promise<void>;
}

export function createSandboxApi(invoke: Invoke<SandboxChannels>): SandboxApi {
  return {
    openSandbox: (request) => invoke("sandbox:open", request),
    setSandboxBounds: (request) => invoke("sandbox:setBounds", request),
    setSandboxVisible: (request) => invoke("sandbox:setVisible", request),
    setSandboxInspect: (request) => invoke("sandbox:setInspect", request),
    sandboxBack: () => invoke("sandbox:back", undefined),
    sandboxForward: () => invoke("sandbox:forward", undefined),
    sandboxReload: () => invoke("sandbox:reload", undefined),
  };
}
