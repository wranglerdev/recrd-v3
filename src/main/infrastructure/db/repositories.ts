import type { AppDatabase } from "./connection.js";
import { CrudRepository } from "./crud-repository.js";
import { cases, executions, masses, plans, projects, scripts, suites } from "./schema.js";

// Typed Repository per entity (PRD §6, §31). Each is a thin CrudRepository over
// its schema table, grouped behind a single factory for the composition root.

export type Repositories = {
  readonly projects: CrudRepository<typeof projects>;
  readonly plans: CrudRepository<typeof plans>;
  readonly suites: CrudRepository<typeof suites>;
  readonly cases: CrudRepository<typeof cases>;
  readonly scripts: CrudRepository<typeof scripts>;
  readonly executions: CrudRepository<typeof executions>;
  readonly masses: CrudRepository<typeof masses>;
};

export function createRepositories(db: AppDatabase): Repositories {
  return {
    projects: new CrudRepository(db, projects),
    plans: new CrudRepository(db, plans),
    suites: new CrudRepository(db, suites),
    cases: new CrudRepository(db, cases),
    scripts: new CrudRepository(db, scripts),
    executions: new CrudRepository(db, executions),
    masses: new CrudRepository(db, masses),
  };
}
