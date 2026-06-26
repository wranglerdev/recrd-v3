// Auditable event recording (PRD §16). Important events (mass import, test
// change, compilation, export, execution) are recorded through an AuditSink.
// Secret redaction (PRD §18) is the sink's responsibility — the logger-backed
// sink in infrastructure scrubs details before they reach any transport.

export type AuditEventType = "mass.import" | "test.change" | "compile" | "export" | "execution";

export type AuditEvent = {
  readonly type: AuditEventType;
  readonly user: string;
  readonly at: string;
  readonly details: Readonly<Record<string, unknown>>;
};

export interface AuditSink {
  record(event: AuditEvent): void;
}

/** A persisted audit event: the event plus the store-assigned id. */
export interface AuditEventRecord extends AuditEvent {
  readonly id: string;
}

/**
 * A queryable audit sink (PRD §16): records events like an {@link AuditSink} and
 * lists them back for the audit trail, newest first. Implemented by the
 * persistent infrastructure store; the use cases only record.
 */
export interface AuditTrail extends AuditSink {
  /** Returns recorded events newest-first, capped to `limit` when given. */
  list(limit?: number): AuditEventRecord[];
}

/** Builds an audit event, records it on the sink, and returns it. */
export function recordAuditEvent(
  sink: AuditSink,
  params: {
    type: AuditEventType;
    user: string;
    now: Date;
    details?: Record<string, unknown>;
  },
): AuditEvent {
  const event: AuditEvent = {
    type: params.type,
    user: params.user,
    at: params.now.toISOString(),
    details: params.details ?? {},
  };
  sink.record(event);
  return event;
}
