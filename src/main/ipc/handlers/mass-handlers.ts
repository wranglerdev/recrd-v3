import type { MassUseCases } from "../../../application/mass/mass-service.js";
import type { CsvFileDialog } from "../../infrastructure/dialog/csv-file-dialog.js";
import type { IpcRegistry } from "../typed-ipc.js";

// Registers the `mass:*` IPC handlers (PRD §7). Thin transport adapters over the
// mass use cases plus the native CSV file dialog, both resolved from the
// container at the composition root.
export interface MassHandlerDeps {
  readonly masses: MassUseCases;
  readonly csvFileDialog: CsvFileDialog;
}

export function registerMassHandlers(registry: IpcRegistry, deps: MassHandlerDeps): void {
  const { masses, csvFileDialog } = deps;

  registry.handle("mass:import", (request) => masses.importCsv(request));
  registry.handle("mass:listByProject", (request) => masses.listByProject(request.projectId));
  registry.handle("mass:rename", (request) => masses.rename(request.id, request.name));
  registry.handle("mass:editValue", (request) => masses.editValue(request));
  registry.handle("mass:selectCsv", () => csvFileDialog.selectCsv());
}
