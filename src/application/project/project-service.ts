import {
  createAuditFields,
  touchAuditFields,
  type AuditFields,
} from "../../domain/audit/audit-fields.js";
import type { UserContext } from "../../domain/auth/user-context.js";

// Project CRUD use cases (PRD §6, §16). Pure orchestration over injected ports —
// a persistence repository, the OS user context, an id generator and a clock — so
// the application layer stays free of Node/Electron and the auditing is
// deterministic and unit-testable. The concrete repository (SQLite) and the
// id/clock providers are wired at the composition root.

/** A persisted Project with its audit trail (PRD §16). */
export interface Project extends AuditFields {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly robotPath: string | null;
}

/**
 * Persistence port for Projects. Implemented by the infrastructure CrudRepository
 * at the composition root; the use cases never touch the database directly.
 */
export interface ProjectRepository {
  create(project: Project): Project;
  findById(id: string): Project | undefined;
  list(): Project[];
  update(id: string, patch: Partial<Project>): Project | undefined;
  remove(id: string): boolean;
}

export type IdGenerator = () => string;
export type Clock = () => Date;

export interface ProjectUseCaseDeps {
  readonly repository: ProjectRepository;
  readonly userContext: UserContext;
  readonly newId: IdGenerator;
  readonly clock: Clock;
}

export interface CreateProjectInput {
  readonly name: string;
  readonly description?: string;
  readonly robotPath?: string | null;
}

export interface UpdateProjectDetailsInput {
  readonly description?: string;
  readonly robotPath?: string | null;
}

/** The Project use cases exposed to the IPC boundary (PRD §6). */
export interface ProjectUseCases {
  /** Creates a project, stamping createdBy/At from the user context. */
  create(input: CreateProjectInput): Project;
  /** Lists every project. */
  list(): Project[];
  /** Opens (reads) a project; throws when it does not exist. */
  open(id: string): Project;
  /** Renames a project, refreshing its update audit fields. */
  rename(id: string, name: string): Project;
  /** Updates the description and/or robot path, refreshing update audit fields. */
  updateDetails(id: string, input: UpdateProjectDetailsInput): Project;
  /** Deletes a project; throws when it does not exist. */
  remove(id: string): void;
}

function requireName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new Error("O nome do projeto é obrigatório");
  }
  return trimmed;
}

export function createProjectUseCases(deps: ProjectUseCaseDeps): ProjectUseCases {
  const { repository, userContext, newId, clock } = deps;

  const open = (id: string): Project => {
    const project = repository.findById(id);
    if (project === undefined) {
      throw new Error(`Projeto não encontrado: ${id}`);
    }
    return project;
  };

  // Reads the project (asserting it exists), then writes the patch with refreshed
  // update-audit fields. `open` guarantees the row exists, so `update` returns it.
  const applyUpdate = (id: string, patch: Partial<Project>): Project => {
    const existing = open(id);
    const audit = touchAuditFields(existing, userContext.username, clock());
    return repository.update(id, {
      ...patch,
      updatedBy: audit.updatedBy,
      updatedAt: audit.updatedAt,
    }) as Project;
  };

  return {
    create(input) {
      const audit = createAuditFields(userContext.username, clock());
      return repository.create({
        id: newId(),
        name: requireName(input.name),
        description: input.description?.trim() ?? "",
        robotPath: input.robotPath ?? null,
        ...audit,
      });
    },
    list: () => repository.list(),
    open,
    rename: (id, name) => applyUpdate(id, { name: requireName(name) }),
    updateDetails(id, input) {
      return applyUpdate(id, {
        ...(input.description !== undefined ? { description: input.description.trim() } : {}),
        ...(input.robotPath !== undefined ? { robotPath: input.robotPath } : {}),
      });
    },
    remove(id) {
      if (!repository.remove(id)) {
        throw new Error(`Projeto não encontrado: ${id}`);
      }
    },
  };
}
