import type {
  AuditEvent,
  AuditEventRecord,
  AuditTrail,
} from "../../../application/audit/audit-service.js";
import { redactSecrets } from "../logging/redact.js";
import type { CrudRepository } from "./crud-repository.js";
import type { auditEvents } from "./schema.js";

// Persistent audit trail (PRD §16) over the generic audit_events CrudRepository.
// `details` is stored as JSON text; secrets are redacted on write (PRD §18) so
// passwords never reach the database. Listing returns events newest-first.

type AuditRow = {
  readonly id: string;
  readonly type: string;
  readonly user: string;
  readonly at: string;
  readonly details: string;
};

function fromRow(row: AuditRow): AuditEventRecord {
  return {
    id: row.id,
    type: row.type as AuditEvent["type"],
    user: row.user,
    at: row.at,
    details: JSON.parse(row.details) as Record<string, unknown>,
  };
}

/**
 * Wraps the audit_events CrudRepository as an {@link AuditTrail}. `newId` mints
 * the row id (the event itself carries no id); `record` redacts and serialises
 * the details, and `list` deserialises and orders by timestamp descending.
 */
export function createAuditTrail(
  repository: CrudRepository<typeof auditEvents>,
  newId: () => string,
): AuditTrail {
  return {
    record(event) {
      repository.create({
        id: newId(),
        type: event.type,
        user: event.user,
        at: event.at,
        details: JSON.stringify(redactSecrets(event.details)),
      });
    },
    list(limit) {
      const records = (repository.list() as AuditRow[])
        .map(fromRow)
        .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
      return limit === undefined ? records : records.slice(0, limit);
    },
  };
}
