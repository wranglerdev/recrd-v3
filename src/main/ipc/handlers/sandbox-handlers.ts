import type { SandboxController } from "../../../application/sandbox/sandbox-controller.js";
import type { IpcRegistry } from "../typed-ipc.js";

// Registers the `sandbox:*` IPC handlers (PRD §10). A thin transport adapter over
// the sandbox controller, resolved from the container at the composition root.
// The renderer drives layout/visibility/navigation; the controller reflects it
// onto the embedded BrowserView.
export function registerSandboxHandlers(
  registry: IpcRegistry,
  controller: SandboxController,
): void {
  registry.handle("sandbox:open", (request) => controller.open(request.url));
  registry.handle("sandbox:setBounds", (request) => controller.setBounds(request));
  registry.handle("sandbox:setVisible", (request) => controller.setVisible(request.visible));
  registry.handle("sandbox:setInspect", (request) => controller.setInspect(request.enabled));
  registry.handle("sandbox:back", () => controller.goBack());
  registry.handle("sandbox:forward", () => controller.goForward());
  registry.handle("sandbox:reload", () => controller.reload());
}
