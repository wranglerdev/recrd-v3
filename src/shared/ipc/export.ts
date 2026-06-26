import { defineChannelNames, type Invoke } from "./core.js";

// `export:*` feature contract — exporting artifacts to the userData exports dir
// (PRD §17). Each channel takes an identifier (a case for the JSON/Robot
// exports, an execution for the log), resolves the real artifact in the main
// process and returns the absolute path written. Plain serialisable wire types,
// so the boundary needs no domain↔DTO mapping.

export interface ExportCaseRequest {
  readonly caseId: string;
}

export interface ExportExecutionRequest {
  readonly executionId: string;
}

/** The absolute path of the file written under the exports directory. */
export interface ExportResult {
  readonly path: string;
}

export type ExportChannels = {
  "export:json": { request: ExportCaseRequest; response: ExportResult };
  "export:robot": { request: ExportCaseRequest; response: ExportResult };
  "export:log": { request: ExportExecutionRequest; response: ExportResult };
};

export const EXPORT_CHANNELS = defineChannelNames<
  ExportChannels,
  ["export:json", "export:robot", "export:log"]
>(["export:json", "export:robot", "export:log"]);

/** The slice of the renderer API served by the export feature. */
export interface ExportApi {
  /** Exports a case's manual script as `<name>.recrd.json`. */
  exportJson(request: ExportCaseRequest): Promise<ExportResult>;
  /** Compiles and exports a case's script as `<name>.robot`. */
  exportRobot(request: ExportCaseRequest): Promise<ExportResult>;
  /** Exports a recorded execution's log as `execution-<date>.log`. */
  exportLog(request: ExportExecutionRequest): Promise<ExportResult>;
}

export function createExportApi(invoke: Invoke<ExportChannels>): ExportApi {
  return {
    exportJson: (request) => invoke("export:json", request),
    exportRobot: (request) => invoke("export:robot", request),
    exportLog: (request) => invoke("export:log", request),
  };
}
