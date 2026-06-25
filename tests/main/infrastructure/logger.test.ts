import { describe, expect, it } from "vitest";
import { SinkLogger, type LogLevel, type LogSink } from "@main/infrastructure/logging/logger";

function recordingSink(): LogSink & {
  records: { level: LogLevel; message: string; meta?: unknown }[];
} {
  const records: { level: LogLevel; message: string; meta?: unknown }[] = [];
  return {
    records,
    write(level, message, meta) {
      records.push({ level, message, meta });
    },
  };
}

describe("SinkLogger", () => {
  it("writes messages at or above the configured level", () => {
    const sink = recordingSink();
    const logger = new SinkLogger({ level: "warn", sink });

    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");

    expect(sink.records.map((r) => r.level)).toEqual(["warn", "error"]);
  });

  it("redacts secrets in metadata before writing (PRD §18)", () => {
    const sink = recordingSink();
    const logger = new SinkLogger({ level: "debug", sink });

    logger.info("login attempt", { username: "ada", password: "hunter2" });

    expect(sink.records[0]?.meta).toEqual({ username: "ada", password: "[REDACTED]" });
  });

  it("omits metadata when none is provided", () => {
    const sink = recordingSink();
    const logger = new SinkLogger({ level: "debug", sink });

    logger.info("no meta");

    expect(sink.records[0]).toEqual({ level: "info", message: "no meta", meta: undefined });
  });
});
