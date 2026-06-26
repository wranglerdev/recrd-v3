import { describe, expect, it, vi } from "vitest";
import {
  createSandboxController,
  type SandboxViewPort,
} from "../../src/application/sandbox/sandbox-controller";

function fakePort(): SandboxViewPort & {
  setBounds: ReturnType<typeof vi.fn>;
  setVisible: ReturnType<typeof vi.fn>;
  loadUrl: ReturnType<typeof vi.fn>;
  goBack: ReturnType<typeof vi.fn>;
  goForward: ReturnType<typeof vi.fn>;
  reload: ReturnType<typeof vi.fn>;
} {
  return {
    setBounds: vi.fn(),
    setVisible: vi.fn(),
    loadUrl: vi.fn(),
    goBack: vi.fn(),
    goForward: vi.fn(),
    reload: vi.fn(),
  };
}

const RECT = { x: 10, y: 20, width: 800, height: 600 };

describe("createSandboxController (PRD §10)", () => {
  it("loads an http(s) URL, shows the view and applies bounds set earlier", () => {
    const port = fakePort();
    const controller = createSandboxController();
    controller.attach(port);
    controller.setBounds(RECT); // not visible yet → not pushed to the port
    expect(port.setBounds).not.toHaveBeenCalled();

    controller.open("https://example.com");

    expect(port.loadUrl).toHaveBeenCalledWith("https://example.com");
    expect(port.setVisible).toHaveBeenLastCalledWith(true);
    expect(port.setBounds).toHaveBeenCalledWith(RECT);
  });

  it("accepts http URLs too", () => {
    const port = fakePort();
    const controller = createSandboxController();
    controller.attach(port);
    controller.open("http://intranet.local/app");
    expect(port.loadUrl).toHaveBeenCalledWith("http://intranet.local/app");
  });

  it("rejects non-http(s) or malformed URLs without touching the port", () => {
    const port = fakePort();
    const controller = createSandboxController();
    controller.attach(port);

    expect(() => controller.open("file:///etc/passwd")).toThrow(/http/i);
    expect(() => controller.open("not a url")).toThrow(/http/i);
    expect(port.loadUrl).not.toHaveBeenCalled();
  });

  it("pushes bounds to the port live once the view is visible", () => {
    const port = fakePort();
    const controller = createSandboxController();
    controller.attach(port);
    controller.setVisible(true);
    port.setBounds.mockClear();

    controller.setBounds(RECT);
    expect(port.setBounds).toHaveBeenCalledWith(RECT);
  });

  it("hides the view without re-applying bounds", () => {
    const port = fakePort();
    const controller = createSandboxController();
    controller.attach(port);
    controller.setBounds(RECT);
    controller.setVisible(true);
    port.setBounds.mockClear();
    port.setVisible.mockClear();

    controller.setVisible(false);
    expect(port.setVisible).toHaveBeenLastCalledWith(false);
    expect(port.setBounds).not.toHaveBeenCalled();
  });

  it("buffers commands until a port is attached, then reflects current state", () => {
    const controller = createSandboxController();
    // No port yet — these must not throw.
    controller.open("https://example.com");
    controller.setBounds(RECT);

    const port = fakePort();
    controller.attach(port);
    // The freshly-attached view is synced to the current (visible) state.
    expect(port.setVisible).toHaveBeenCalledWith(true);
    expect(port.setBounds).toHaveBeenCalledWith(RECT);
  });

  it("does not apply bounds on attach when hidden", () => {
    const controller = createSandboxController();
    controller.setBounds(RECT); // hidden, no port
    const port = fakePort();
    controller.attach(port);
    expect(port.setVisible).toHaveBeenCalledWith(false);
    expect(port.setBounds).not.toHaveBeenCalled();
  });

  it("forwards back/forward/reload to the port", () => {
    const port = fakePort();
    const controller = createSandboxController();
    controller.attach(port);

    controller.goBack();
    controller.goForward();
    controller.reload();
    expect(port.goBack).toHaveBeenCalledOnce();
    expect(port.goForward).toHaveBeenCalledOnce();
    expect(port.reload).toHaveBeenCalledOnce();
  });

  it("ignores back/forward/reload before a port is attached", () => {
    const controller = createSandboxController();
    expect(() => {
      controller.goBack();
      controller.goForward();
      controller.reload();
    }).not.toThrow();
  });
});
