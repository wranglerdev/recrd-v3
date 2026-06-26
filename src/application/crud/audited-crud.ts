import { touchAuditFields, type AuditFields } from "../../domain/audit/audit-fields.js";
import type { UserContext } from "../../domain/auth/user-context.js";

// Shared building blocks for audited CRUD use cases (PRD §6, §16). Kept generic
// and platform-agnostic so the hierarchy services (Plan/Suite/Case) reuse the
// same read/update/audit logic instead of duplicating it.

/** An entity with an id and an audit trail. */
export interface Identified extends AuditFields {
  readonly id: string;
}

/**
 * Persistence port over an {@link Identified} entity. Implemented by the
 * infrastructure CrudRepository at the composition root.
 */
export interface EntityRepository<E extends Identified> {
  create(entity: E): E;
  findById(id: string): E | undefined;
  list(): E[];
  update(id: string, patch: Partial<E>): E | undefined;
  remove(id: string): boolean;
}

export type IdGenerator = () => string;
export type Clock = () => Date;

/** Audit/identity collaborators every use case needs. */
export interface AuditContext {
  readonly userContext: UserContext;
  readonly newId: IdGenerator;
  readonly clock: Clock;
}

/** Trims and validates a required free-text field, throwing on blank. */
export function requireText(value: string, fieldLabel: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`${fieldLabel} é obrigatório`);
  }
  return trimmed;
}

/** Reads an entity, throwing a labelled error when it does not exist. */
export function openOrThrow<E extends Identified>(
  repository: EntityRepository<E>,
  id: string,
  label: string,
): E {
  const entity = repository.findById(id);
  if (entity === undefined) {
    throw new Error(`${label} inexistente: ${id}`);
  }
  return entity;
}

/** Checks whether a parent entity exists (e.g. backed by repository.findById). */
export type ParentCheck = (id: string) => boolean;

/** Asserts a parent entity exists before a child is created (hierarchy integrity). */
export function requireParentExists(check: ParentCheck, id: string, label: string): void {
  if (!check(id)) {
    throw new Error(`${label} inexistente: ${id}`);
  }
}

/**
 * Applies a patch with refreshed update-audit fields. `openOrThrow` guarantees
 * the row exists, so `update` returns it.
 */
export function auditedUpdate<E extends Identified>(
  repository: EntityRepository<E>,
  context: AuditContext,
  id: string,
  patch: Partial<E>,
  label: string,
): E {
  const existing = openOrThrow(repository, id, label);
  const audit = touchAuditFields(existing, context.userContext.username, context.clock());
  return repository.update(id, {
    ...patch,
    updatedBy: audit.updatedBy,
    updatedAt: audit.updatedAt,
  }) as E;
}

/** Deletes an entity, throwing a labelled error when it does not exist. */
export function removeOrThrow<E extends Identified>(
  repository: EntityRepository<E>,
  id: string,
  label: string,
): void {
  if (!repository.remove(id)) {
    throw new Error(`${label} inexistente: ${id}`);
  }
}
