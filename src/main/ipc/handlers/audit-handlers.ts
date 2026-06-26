import type { AuditTrail } from "../../../application/audit/audit-service.js";
import type { IpcRegistry } from "../typed-ipc.js";

// Registers the `audit:*` IPC handlers (PRD §16). A thin transport adapter over
// the persistent audit trail, resolved from the container at the composition
// root. Only the read side is exposed; events are recorded by the mutating use
// cases, not the renderer.
export function registerAuditHandlers(
  registry: IpcRegistry,
  trail: Pick<AuditTrail, "list">,
): void {
  registry.handle("audit:list", (request) => trail.list(request.limit));
}
