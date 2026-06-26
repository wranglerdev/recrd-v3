import { defineChannelNames, type Invoke } from "./core.js";

// `audit:*` feature contract — the read side of the audit trail (PRD §16).
// Mutating use cases record events into the persistent trail in the main
// process; the renderer reads them back here to render the audit screen. Wire
// types mirror the application AuditEventRecord (ISO timestamp, plain details
// map), so the boundary is serialisable with no domain↔DTO mapping.

export type AuditEventTypeDto = "mass.import" | "test.change" | "compile" | "export" | "execution";

export interface AuditEventDto {
  readonly id: string;
  readonly type: AuditEventTypeDto;
  readonly user: string;
  readonly at: string;
  readonly details: Readonly<Record<string, unknown>>;
}

export interface ListAuditEventsRequest {
  /** Caps the number of (newest-first) events returned; all when omitted. */
  readonly limit?: number;
}

export type AuditChannels = {
  "audit:list": { request: ListAuditEventsRequest; response: readonly AuditEventDto[] };
};

export const AUDIT_CHANNELS = defineChannelNames<AuditChannels, ["audit:list"]>(["audit:list"]);

/** The slice of the renderer API served by the audit feature. */
export interface AuditApi {
  listAuditEvents(request: ListAuditEventsRequest): Promise<readonly AuditEventDto[]>;
}

export function createAuditApi(invoke: Invoke<AuditChannels>): AuditApi {
  return {
    listAuditEvents: (request) => invoke("audit:list", request),
  };
}
