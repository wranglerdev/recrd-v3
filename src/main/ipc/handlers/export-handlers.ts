import type { ExportUseCases } from "../../../application/export/export-service.js";
import type { IpcRegistry } from "../typed-ipc.js";

// Registers the `export:*` IPC handlers (PRD §17). A thin transport adapter over
// the export use cases, resolved from the container at the composition root. Each
// channel returns the path written under the exports directory.
export function registerExportHandlers(registry: IpcRegistry, useCases: ExportUseCases): void {
  registry.handle("export:json", async (request) => ({
    path: await useCases.exportJson(request.caseId),
  }));
  registry.handle("export:robot", async (request) => ({
    path: await useCases.exportRobot(request.caseId),
  }));
  registry.handle("export:log", async (request) => ({
    path: await useCases.exportLog(request.executionId),
  }));
}
