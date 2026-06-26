import {
  createAuditFields,
  touchAuditFields,
  type AuditFields,
} from "../../domain/audit/audit-fields.js";
import { parseMassCsv } from "../../domain/mass/mass-csv.js";
import { editMassValue, massFromCsv, renameMass, type Mass } from "../../domain/mass/mass.js";
import {
  requireParentExists,
  requireText,
  type AuditContext,
  type ParentCheck,
} from "../crud/audited-crud.js";

// Test-mass import use case (PRD §7, §16). Parses CSV via the domain parser,
// builds the Mass aggregate (with an initial import-history entry), stamps audit
// fields and persists it under its Project. Pure orchestration over injected
// ports — no Node/Electron. CSV content errors are returned as a result (the UI
// shows them); a missing parent or blank name are precondition failures that
// throw, mirroring the hierarchy use cases.

/** A persisted mass: the domain aggregate plus its owning project and audit trail. */
export interface StoredMass extends Mass, AuditFields {
  readonly projectId: string;
}

/** Persistence port for masses, implemented by the infrastructure adapter. */
export interface MassRepository {
  create(mass: StoredMass): StoredMass;
  findById(id: string): StoredMass | undefined;
  list(): StoredMass[];
  update(id: string, patch: Partial<StoredMass>): StoredMass | undefined;
}

export interface ImportMassInput {
  readonly projectId: string;
  readonly name: string;
  readonly csv: string;
  /** Origin of the import (e.g. the source file path), recorded in the history. */
  readonly source: string;
}

export type ImportMassResult =
  | { readonly ok: true; readonly mass: StoredMass }
  | { readonly ok: false; readonly errors: readonly string[] };

export interface MassUseCaseDeps extends AuditContext {
  readonly repository: MassRepository;
  /** Existence check for the parent Project (hierarchy integrity). */
  readonly projectExists: ParentCheck;
}

export interface EditMassValueInput {
  readonly id: string;
  readonly rowIndex: number;
  readonly column: string;
  readonly value: string;
}

export interface MassUseCases {
  importCsv(input: ImportMassInput): ImportMassResult;
  /** Lists every mass under a project (newest persistence order preserved). */
  listByProject(projectId: string): StoredMass[];
  /** Renames a mass, refreshing its update audit fields. */
  rename(id: string, name: string): StoredMass;
  /** Edits a single cell value, refreshing its update audit fields. */
  editValue(input: EditMassValueInput): StoredMass;
}

export function createMassUseCases(deps: MassUseCaseDeps): MassUseCases {
  const { repository, projectExists, userContext, newId, clock } = deps;

  // Reads the mass (asserting it exists), applies a pure domain transform, then
  // persists it with refreshed update-audit fields. `findById` guarantees the row
  // exists, so `update` returns it.
  const auditedTransform = (id: string, transform: (mass: StoredMass) => Mass): StoredMass => {
    const existing = repository.findById(id);
    if (existing === undefined) {
      throw new Error(`Massa inexistente: ${id}`);
    }
    const transformed = transform(existing);
    const audit = touchAuditFields(existing, userContext.username, clock());
    return repository.update(id, {
      ...transformed,
      updatedBy: audit.updatedBy,
      updatedAt: audit.updatedAt,
    }) as StoredMass;
  };

  return {
    importCsv(input) {
      requireParentExists(projectExists, input.projectId, "Projeto");
      const name = requireText(input.name, "O nome da massa");

      const parsed = parseMassCsv(input.csv);
      if (!parsed.ok) {
        return { ok: false, errors: parsed.errors };
      }

      const now = clock();
      const mass = massFromCsv(newId(), name, parsed.mass, now.toISOString(), input.source);
      const stored: StoredMass = {
        ...mass,
        projectId: input.projectId,
        ...createAuditFields(userContext.username, now),
      };
      return { ok: true, mass: repository.create(stored) };
    },
    listByProject: (projectId) => repository.list().filter((mass) => mass.projectId === projectId),
    rename: (id, name) =>
      auditedTransform(id, (mass) => renameMass(mass, requireText(name, "O nome da massa"))),
    editValue: (input) =>
      auditedTransform(input.id, (mass) =>
        editMassValue(mass, input.rowIndex, input.column, input.value),
      ),
  };
}
