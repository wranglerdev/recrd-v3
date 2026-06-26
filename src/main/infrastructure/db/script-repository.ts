import type {
  CompiledScript,
  CompiledScriptRepository,
} from "../../../application/compile/compile-service.js";
import type { CrudRepository } from "./crud-repository.js";
import type { scripts } from "./schema.js";

// Adapts the generic scripts CrudRepository to the application's
// CompiledScriptRepository port (PRD §13). The schema types `kind` as a plain
// string; this narrows it back to the "compiled" literal the domain expects.

/** Wraps the scripts CrudRepository as a domain-typed CompiledScriptRepository. */
export function createCompiledScriptRepository(
  repository: CrudRepository<typeof scripts>,
): CompiledScriptRepository {
  return {
    create: (script) => repository.create(script) as CompiledScript,
  };
}
