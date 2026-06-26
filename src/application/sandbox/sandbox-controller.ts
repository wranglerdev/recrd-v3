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
}

export interface SandboxController {
  /** Loads an http(s) URL into the sandbox and shows it. Throws on a bad URL. */
  open(url: string): void;
  /** Updates the sandbox bounds to match the renderer layout (applied when shown). */
  setBounds(rect: SandboxRect): void;
  /** Shows or hides the sandbox view. */
  setVisible(visible: boolean): void;
  /**
   * Attaches the Electron-backed view port (once the window exists). The current
   * visibility/bounds are reflected onto the freshly-attached view immediately.
   */
  attach(port: SandboxViewPort): void;
}

export function createSandboxController(): SandboxController {
  let port: SandboxViewPort | null = null;
  let bounds: SandboxRect | null = null;
  let visible = false;

  /** Reflects the current visibility/bounds onto the attached port (no-op until attached). */
  function apply(): void {
    if (port === null) {
      return;
    }
    port.setVisible(visible);
    if (visible && bounds !== null) {
      port.setBounds(bounds);
    }
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
    attach(next) {
      port = next;
      apply();
    },
  };
}
