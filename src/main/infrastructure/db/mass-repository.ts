import type { MassRepository, StoredMass } from "../../../application/mass/mass-service.js";
import type { MassRecord } from "../../../domain/mass/mass-csv.js";
import type { MassImport } from "../../../domain/mass/mass.js";
import type { CrudRepository } from "./crud-repository.js";
import type { masses } from "./schema.js";

// Adapts the generic masses CrudRepository to the application's MassRepository
// port (PRD §7). The columns/rows/history aggregate fields are stored as JSON
// text, so this is where (de)serialisation happens — keeping the application
// layer in domain types and the database in its flat row shape.

type MassRow = {
  readonly id: string;
  readonly projectId: string;
  readonly name: string;
  readonly columns: string;
  readonly rows: string;
  readonly history: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedBy: string;
  readonly updatedAt: string;
};

function toRow(mass: StoredMass): MassRow {
  return {
    id: mass.id,
    projectId: mass.projectId,
    name: mass.name,
    columns: JSON.stringify(mass.columns),
    rows: JSON.stringify(mass.rows),
    history: JSON.stringify(mass.history),
    createdBy: mass.createdBy,
    createdAt: mass.createdAt,
    updatedBy: mass.updatedBy,
    updatedAt: mass.updatedAt,
  };
}

function fromRow(row: MassRow): StoredMass {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    columns: JSON.parse(row.columns) as string[],
    rows: JSON.parse(row.rows) as MassRecord[],
    history: JSON.parse(row.history) as MassImport[],
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedBy: row.updatedBy,
    updatedAt: row.updatedAt,
  };
}

/** Serialises the JSON aggregate fields present in a partial mass patch. */
function toRowPatch(patch: Partial<StoredMass>): Partial<MassRow> {
  return {
    ...(patch.id !== undefined ? { id: patch.id } : {}),
    ...(patch.projectId !== undefined ? { projectId: patch.projectId } : {}),
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.columns !== undefined ? { columns: JSON.stringify(patch.columns) } : {}),
    ...(patch.rows !== undefined ? { rows: JSON.stringify(patch.rows) } : {}),
    ...(patch.history !== undefined ? { history: JSON.stringify(patch.history) } : {}),
    ...(patch.createdBy !== undefined ? { createdBy: patch.createdBy } : {}),
    ...(patch.createdAt !== undefined ? { createdAt: patch.createdAt } : {}),
    ...(patch.updatedBy !== undefined ? { updatedBy: patch.updatedBy } : {}),
    ...(patch.updatedAt !== undefined ? { updatedAt: patch.updatedAt } : {}),
  };
}

/** Wraps the masses CrudRepository as a domain-typed MassRepository. */
export function createMassRepository(repository: CrudRepository<typeof masses>): MassRepository {
  return {
    create: (mass) => fromRow(repository.create(toRow(mass))),
    findById: (id) => {
      const row = repository.findById(id) as MassRow | undefined;
      return row === undefined ? undefined : fromRow(row);
    },
    list: () => (repository.list() as MassRow[]).map(fromRow),
    update: (id, patch) => {
      const row = repository.update(id, toRowPatch(patch)) as MassRow | undefined;
      return row === undefined ? undefined : fromRow(row);
    },
  };
}
