import type {
  ManualScriptRecord,
  ManualScriptStore,
} from "../../../application/scripts/script-service.js";
import type { CrudRepository } from "./crud-repository.js";
import type { scripts } from "./schema.js";

// Adapts the generic scripts CrudRepository to the application's
// ManualScriptStore port (PRD §6, §10). The schema types `kind` as a plain
// string and offers only `id` lookups, so this narrows `kind` back to "manual"
// and resolves a case's manual script by scanning the rows (a case has at most
// one). The newest by `updatedAt` wins if duplicates ever exist.

type ScriptRow = ManualScriptRecord & { kind: string };

/** Wraps the scripts CrudRepository as a domain-typed ManualScriptStore. */
export function createManualScriptStore(
  repository: CrudRepository<typeof scripts>,
): ManualScriptStore {
  return {
    findByCase: (caseId) =>
      (repository.list() as ScriptRow[])
        .filter((row) => row.caseId === caseId && row.kind === "manual")
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0))[0],
    create: (record) => repository.create(record) as ManualScriptRecord,
    update: (id, patch) => repository.update(id, patch) as ManualScriptRecord | undefined,
  };
}
