import { defineChannelNames, type Invoke } from "./core.js";

// `mass:*` feature contract — test-mass import/list/edit (PRD §7, §16). Follows
// the app template. Wire types mirror the application StoredMass (audit fields
// are ISO strings; rows are plain string maps), so the boundary is serialisable
// with no domain↔DTO mapping.

export type MassRow = Readonly<Record<string, string>>;

export interface MassImportEntryDto {
  readonly at: string;
  readonly rowCount: number;
  readonly source: string;
}

export interface MassDto {
  readonly id: string;
  readonly projectId: string;
  readonly name: string;
  readonly columns: readonly string[];
  readonly rows: readonly MassRow[];
  readonly history: readonly MassImportEntryDto[];
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedBy: string;
  readonly updatedAt: string;
}

export interface ImportMassRequest {
  readonly projectId: string;
  readonly name: string;
  readonly csv: string;
  readonly source: string;
}

export type ImportMassResponse =
  | { readonly ok: true; readonly mass: MassDto }
  | { readonly ok: false; readonly errors: readonly string[] };

export interface ListMassesRequest {
  readonly projectId: string;
}

export interface RenameMassRequest {
  readonly id: string;
  readonly name: string;
}

export interface EditMassValueRequest {
  readonly id: string;
  readonly rowIndex: number;
  readonly column: string;
  readonly value: string;
}

/** A CSV file chosen via the native dialog: its path and decoded content. */
export interface CsvSelectionDto {
  readonly path: string;
  readonly content: string;
}

export type MassChannels = {
  "mass:import": { request: ImportMassRequest; response: ImportMassResponse };
  "mass:listByProject": { request: ListMassesRequest; response: readonly MassDto[] };
  "mass:rename": { request: RenameMassRequest; response: MassDto };
  "mass:editValue": { request: EditMassValueRequest; response: MassDto };
  "mass:selectCsv": { request: void; response: CsvSelectionDto | null };
};

export const MASS_CHANNELS = defineChannelNames<
  MassChannels,
  ["mass:import", "mass:listByProject", "mass:rename", "mass:editValue", "mass:selectCsv"]
>(["mass:import", "mass:listByProject", "mass:rename", "mass:editValue", "mass:selectCsv"]);

/** The slice of the renderer API served by the mass feature. */
export interface MassApi {
  importMass(request: ImportMassRequest): Promise<ImportMassResponse>;
  listMassesByProject(request: ListMassesRequest): Promise<readonly MassDto[]>;
  renameMass(request: RenameMassRequest): Promise<MassDto>;
  editMassValue(request: EditMassValueRequest): Promise<MassDto>;
  selectCsvFile(): Promise<CsvSelectionDto | null>;
}

export function createMassApi(invoke: Invoke<MassChannels>): MassApi {
  return {
    importMass: (request) => invoke("mass:import", request),
    listMassesByProject: (request) => invoke("mass:listByProject", request),
    renameMass: (request) => invoke("mass:rename", request),
    editMassValue: (request) => invoke("mass:editValue", request),
    selectCsvFile: () => invoke("mass:selectCsv", undefined),
  };
}
