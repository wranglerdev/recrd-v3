import type { ProjectUseCases } from "../../../application/project/project-service.js";
import type { IpcRegistry } from "../typed-ipc.js";

// Registers the `project:*` IPC handlers (PRD §6). Thin transport adapters: each
// channel maps to a Project use case. The use cases are resolved from the
// container at the composition root and injected here.
export function registerProjectHandlers(registry: IpcRegistry, useCases: ProjectUseCases): void {
  registry.handle("project:create", (request) => useCases.create(request));
  registry.handle("project:list", () => useCases.list());
  registry.handle("project:open", (request) => useCases.open(request.id));
  registry.handle("project:rename", (request) => useCases.rename(request.id, request.name));
  registry.handle("project:updateDetails", ({ id, ...details }) =>
    useCases.updateDetails(id, details),
  );
  registry.handle("project:remove", (request) => useCases.remove(request.id));
}
