import type { RobotProjectUseCases } from "../../../application/robot/robot-project-service.js";
import type { IpcRegistry } from "../typed-ipc.js";

// Registers the `robot:*` IPC handlers (PRD §14). The use case is resolved from
// the container at the composition root and injected, so this stays a thin
// transport adapter that maps the channel to the use case.
export function registerRobotHandlers(
  registry: IpcRegistry,
  useCases: RobotProjectUseCases,
): void {
  registry.handle("robot:scaffold", (request) => useCases.scaffold(request));
}
