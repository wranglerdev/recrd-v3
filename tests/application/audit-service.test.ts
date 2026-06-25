import { describe, expect, it } from "vitest";
import {
  recordAuditEvent,
  type AuditEvent,
  type AuditSink,
} from "../../src/application/audit/audit-service";

function recordingSink(): AuditSink & { events: AuditEvent[] } {
  const events: AuditEvent[] = [];
  return { events, record: (event) => events.push(event) };
}

describe("recordAuditEvent (PRD §16)", () => {
  it("builds and records an event with an ISO timestamp", () => {
    const sink = recordingSink();
    const event = recordAuditEvent(sink, {
      type: "export",
      user: "ada",
      now: new Date("2026-06-20T10:00:00Z"),
      details: { file: "login.robot" },
    });

    expect(event).toEqual({
      type: "export",
      user: "ada",
      at: "2026-06-20T10:00:00.000Z",
      details: { file: "login.robot" },
    });
    expect(sink.events).toEqual([event]);
  });

  it("defaults details to an empty object", () => {
    const sink = recordingSink();
    const event = recordAuditEvent(sink, {
      type: "execution",
      user: "ada",
      now: new Date("2026-06-20T10:00:00Z"),
    });
    expect(event.details).toEqual({});
  });
});
