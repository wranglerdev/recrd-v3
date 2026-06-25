import { describe, expect, it } from "vitest";
import { recordAuditEvent } from "@application/audit/audit-service";
import { LoggerAuditSink } from "@main/infrastructure/audit/logger-audit-sink";
import { SinkLogger, type LogLevel, type LogSink } from "@main/infrastructure/logging/logger";

describe("LoggerAuditSink (PRD §16, §18)", () => {
  it("logs the event and redacts secrets in the details", () => {
    const records: { level: LogLevel; message: string; meta?: unknown }[] = [];
    const logSink: LogSink = {
      write: (level, message, meta) => records.push({ level, message, meta }),
    };
    const sink = new LoggerAuditSink(new SinkLogger({ level: "info", sink: logSink }));

    recordAuditEvent(sink, {
      type: "mass.import",
      user: "ada",
      now: new Date("2026-06-20T10:00:00Z"),
      details: { rows: 2, password: "hunter2" },
    });

    expect(records[0]?.message).toBe("audit:mass.import");
    expect(records[0]?.meta).toEqual({
      user: "ada",
      at: "2026-06-20T10:00:00.000Z",
      details: { rows: 2, password: "[REDACTED]" },
    });
  });
});
