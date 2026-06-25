// Audit fields applied to all persisted objects (PRD §16). Pure helpers with the
// user and clock passed in, so timestamps are deterministic and testable.

export type AuditFields = {
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedBy: string;
  readonly updatedAt: string;
};

/** Stamps creation: created and updated start equal. */
export function createAuditFields(user: string, now: Date): AuditFields {
  const timestamp = now.toISOString();
  return { createdBy: user, createdAt: timestamp, updatedBy: user, updatedAt: timestamp };
}

/** Stamps an update: keeps created*, refreshes updatedBy/updatedAt. */
export function touchAuditFields(fields: AuditFields, user: string, now: Date): AuditFields {
  return { ...fields, updatedBy: user, updatedAt: now.toISOString() };
}
