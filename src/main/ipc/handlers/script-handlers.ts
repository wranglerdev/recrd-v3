import type { ScriptUseCases } from "../../../application/scripts/script-service.js";
import type { IpcRegistry } from "../typed-ipc.js";

// Registers the `script:*` IPC handlers (PRD §6, §10). A thin transport adapter
// over the manual-script use cases, resolved from the container at the
// composition root. Save returns nothing; get returns the script or null.
export function registerScriptHandlers(registry: IpcRegistry, useCases: ScriptUseCases): void {
  registry.handle("script:saveManual", (request) => {
    useCases.saveManual({ caseId: request.caseId, script: request.script });
  });
  registry.handle("script:getManual", (request) => useCases.getManual(request.caseId) ?? null);
}
