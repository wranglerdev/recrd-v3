import { describe, expect, it, vi } from "vitest";
import { registerSandboxHandlers } from "@main/ipc/handlers/sandbox-handlers";
import { IpcRegistry } from "@main/ipc/typed-ipc";
import type { SandboxController } from "@application/sandbox/sandbox-controller";

function controller(overrides?: Partial<SandboxController>): SandboxController {
  return {
    open: vi.fn(),
    setBounds: vi.fn(),
    setVisible: vi.fn(),
    attach: vi.fn(),
    ...overrides,
  };
}

describe("registerSandboxHandlers (PRD §10)", () => {
  it("opens a URL in the sandbox", async () => {
    const ctrl = controller();
    const registry = new IpcRegistry();
    registerSandboxHandlers(registry, ctrl);

    await registry.dispatch("sandbox:open", { url: "https://example.com" });
    expect(ctrl.open).toHaveBeenCalledWith("https://example.com");
  });

  it("forwards bounds to the controller", async () => {
    const ctrl = controller();
    const registry = new IpcRegistry();
    registerSandboxHandlers(registry, ctrl);

    const rect = { x: 1, y: 2, width: 300, height: 400 };
    await registry.dispatch("sandbox:setBounds", rect);
    expect(ctrl.setBounds).toHaveBeenCalledWith(rect);
  });

  it("forwards visibility to the controller", async () => {
    const ctrl = controller();
    const registry = new IpcRegistry();
    registerSandboxHandlers(registry, ctrl);

    await registry.dispatch("sandbox:setVisible", { visible: false });
    expect(ctrl.setVisible).toHaveBeenCalledWith(false);
  });
});
