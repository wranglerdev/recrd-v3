import type { AuditEvent, AuditSink } from "../../../application/audit/audit-service.js";
import type { Logger } from "../logging/logger.js";

// Logger-backed audit sink. The Logger redacts secrets in the event payload
// before it reaches any transport (PRD §18), so audit logs never record
// passwords.
export class LoggerAuditSink implements AuditSink {
  constructor(private readonly logger: Logger) {}

  record(event: AuditEvent): void {
    this.logger.info(`audit:${event.type}`, {
      user: event.user,
      at: event.at,
      details: event.details,
    });
  }
}
