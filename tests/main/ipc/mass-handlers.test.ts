import { describe, expect, it, vi } from "vitest";
import { registerMassHandlers } from "@main/ipc/handlers/mass-handlers";
import { IpcRegistry } from "@main/ipc/typed-ipc";
import type { MassUseCases } from "@application/mass/mass-service";
import type { CsvFileDialog } from "@main/infrastructure/dialog/csv-file-dialog";

function fakeMassUseCases(): MassUseCases {
  return {
    importCsv: vi.fn(() => ({ ok: true, mass: { id: "m1" } })),
    listByProject: vi.fn(() => []),
    rename: vi.fn((id, name) => ({ id, name })),
    editValue: vi.fn((input) => ({ id: input.id })),
  } as unknown as MassUseCases;
}

describe("registerMassHandlers", () => {
  it("maps mass CRUD channels to the use cases", async () => {
    const masses = fakeMassUseCases();
    const csvFileDialog: CsvFileDialog = { selectCsv: vi.fn(async () => null) };
    const registry = new IpcRegistry();
    registerMassHandlers(registry, { masses, csvFileDialog });

    await registry.dispatch("mass:import", {
      projectId: "p1",
      name: "M",
      csv: "a\n1",
      source: "x",
    });
    expect(masses.importCsv).toHaveBeenCalledWith({
      projectId: "p1",
      name: "M",
      csv: "a\n1",
      source: "x",
    });

    await registry.dispatch("mass:listByProject", { projectId: "p1" });
    expect(masses.listByProject).toHaveBeenCalledWith("p1");

    await registry.dispatch("mass:rename", { id: "m1", name: "Novo" });
    expect(masses.rename).toHaveBeenCalledWith("m1", "Novo");

    await registry.dispatch("mass:editValue", { id: "m1", rowIndex: 0, column: "a", value: "b" });
    expect(masses.editValue).toHaveBeenCalledWith({ id: "m1", rowIndex: 0, column: "a", value: "b" });
  });

  it("delegates mass:selectCsv to the file dialog", async () => {
    const masses = fakeMassUseCases();
    const selection = { path: "/tmp/u.csv", content: "a\n1" };
    const csvFileDialog: CsvFileDialog = { selectCsv: vi.fn(async () => selection) };
    const registry = new IpcRegistry();
    registerMassHandlers(registry, { masses, csvFileDialog });

    await expect(registry.dispatch("mass:selectCsv", undefined)).resolves.toEqual(selection);
    expect(csvFileDialog.selectCsv).toHaveBeenCalled();
  });
});
