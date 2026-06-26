import { describe, expect, it, vi } from "vitest";
import { registerExportHandlers } from "@main/ipc/handlers/export-handlers";
import { IpcRegistry } from "@main/ipc/typed-ipc";
import type { ExportUseCases } from "@application/export/export-service";

function useCases(overrides?: Partial<ExportUseCases>): ExportUseCases {
  return {
    exportJson: vi.fn().mockResolvedValue("/exports/a.recrd.json"),
    exportRobot: vi.fn().mockResolvedValue("/exports/a.robot"),
    exportLog: vi.fn().mockResolvedValue("/exports/execution-2026-06-20.log"),
    ...overrides,
  };
}

describe("registerExportHandlers (PRD §17)", () => {
  it("exports a case's manual script JSON, wrapping the path", async () => {
    const cases = useCases();
    const registry = new IpcRegistry();
    registerExportHandlers(registry, cases);

    await expect(registry.dispatch("export:json", { caseId: "c1" })).resolves.toEqual({
      path: "/exports/a.recrd.json",
    });
    expect(cases.exportJson).toHaveBeenCalledWith("c1");
  });

  it("exports a case's compiled Robot, wrapping the path", async () => {
    const cases = useCases();
    const registry = new IpcRegistry();
    registerExportHandlers(registry, cases);

    await expect(registry.dispatch("export:robot", { caseId: "c1" })).resolves.toEqual({
      path: "/exports/a.robot",
    });
    expect(cases.exportRobot).toHaveBeenCalledWith("c1");
  });

  it("exports an execution log, wrapping the path", async () => {
    const cases = useCases();
    const registry = new IpcRegistry();
    registerExportHandlers(registry, cases);

    await expect(registry.dispatch("export:log", { executionId: "e1" })).resolves.toEqual({
      path: "/exports/execution-2026-06-20.log",
    });
    expect(cases.exportLog).toHaveBeenCalledWith("e1");
  });
});
