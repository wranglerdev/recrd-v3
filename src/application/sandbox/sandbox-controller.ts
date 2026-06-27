// Browser Sandbox coordination (PRD §10). The renderer owns the layout, so it
// drives where the embedded BrowserView sits, whether it is shown and what it
// loads. This controller is the pure state machine behind those commands: it
// remembers the requested bounds/visibility/URL and reflects them onto an
// injected port. The port is the only Electron-coupled seam (it wraps the
// BrowserView + host window) and is attached once the window exists, so the
// controller itself stays free of Electron and fully unit-testable.

/** Pixel rectangle (relative to the host window's content area). */
export interface SandboxRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Electron-backed view operations, implemented by the infrastructure adapter. */
export interface SandboxViewPort {
  /** Positions the view within the host window. */
  setBounds(rect: SandboxRect): void;
  /** Attaches (true) or detaches (false) the view from the host window. */
  setVisible(visible: boolean): void;
  /** Navigates the view to an absolute URL. */
  loadUrl(url: string): void;
  /** Navigates back in the view's history, if possible. */
  goBack(): void;
  /** Navigates forward in the view's history, if possible. */
  goForward(): void;
  /** Reloads the current page, preserving the session when possible. */
  reload(): void;
  /** Pushes the Inspect-mode toggle to the embedded view's content-script. */
  setInspect(enabled: boolean): void;
}

export interface SandboxController {
  /** Loads an http(s) URL into the sandbox and shows it. Throws on a bad URL. */
  open(url: string): void;
  /** Updates the sandbox bounds to match the renderer layout (applied when shown). */
  setBounds(rect: SandboxRect): void;
  /** Shows or hides the sandbox view. */
  setVisible(visible: boolean): void;
  /** Navigates back in the sandbox history. */
  goBack(): void;
  /** Navigates forward in the sandbox history. */
  goForward(): void;
  /** Reloads the current sandbox page (keeps the session when possible). */
  reload(): void;
  /** Enables or disables Inspect mode (hover overlay) in the sandbox (PRD §10). */
  setInspect(enabled: boolean): void;
  /**
   * Attaches the Electron-backed view port (once the window exists). The current
   * visibility/bounds/inspect state are reflected onto the freshly-attached view
   * immediately.
   */
  attach(port: SandboxViewPort): void;
}

export function createSandboxController(): SandboxController {
  let port: SandboxViewPort | null = null;
  let bounds: SandboxRect | null = null;
  let visible = false;
  let inspect = false;

  /** Reflects the current visibility/bounds/inspect onto the attached port (no-op until attached). */
  function apply(): void {
    if (port === null) {
      return;
    }
    port.setVisible(visible);
    if (visible && bounds !== null) {
      port.setBounds(bounds);
    }
    port.setInspect(inspect);
  }

  return {
    open(url) {
      // Restrict to web schemes so the sandbox cannot be pointed at file:// or a
      // custom protocol (PRD §18). Kept as a string check to stay platform-
      // agnostic (no `URL` global in the application layer).
      if (!/^https?:\/\/\S/i.test(url)) {
        throw new Error("URL do sandbox deve usar http(s).");
      }
      visible = true;
      port?.loadUrl(url);
      apply();
    },
    setBounds(rect) {
      bounds = rect;
      if (visible && port !== null) {
        port.setBounds(rect);
      }
    },
    setVisible(next) {
      visible = next;
      apply();
    },
    goBack() {
      port?.goBack();
    },
    goForward() {
      port?.goForward();
    },
    reload() {
      port?.reload();
    },
    setInspect(enabled) {
      inspect = enabled;
      port?.setInspect(enabled);
    },
    attach(next) {
      port = next;
      apply();
    },
  };
}
