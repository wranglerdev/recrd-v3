import { redactSecrets } from "./redact.js";

// Structured logging abstraction (PRD §31: observabilidade local). Application
// code depends on this interface, never on a concrete transport, so the logger
// can be swapped or faked. Every metadata payload is passed through
// `redactSecrets` so secrets never reach a transport (PRD §18).

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
}

/** Low-level sink a logger writes to, after level filtering and redaction. */
export interface LogSink {
  write(level: LogLevel, message: string, meta?: unknown): void;
}

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

/**
 * Logger that filters by level and redacts metadata before handing it to a sink.
 * Defaults to a console sink, which makes it usable in dev/tests without Electron.
 */
export class SinkLogger implements Logger {
  private readonly sink: LogSink;
  private readonly minLevel: number;

  constructor(options: { level?: LogLevel; sink?: LogSink } = {}) {
    this.minLevel = LEVEL_ORDER[options.level ?? "info"];
    this.sink = options.sink ?? consoleSink;
  }

  debug(message: string, meta?: unknown): void {
    this.emit("debug", message, meta);
  }

  info(message: string, meta?: unknown): void {
    this.emit("info", message, meta);
  }

  warn(message: string, meta?: unknown): void {
    this.emit("warn", message, meta);
  }

  error(message: string, meta?: unknown): void {
    this.emit("error", message, meta);
  }

  private emit(level: LogLevel, message: string, meta?: unknown): void {
    if (LEVEL_ORDER[level] < this.minLevel) {
      return;
    }
    this.sink.write(level, message, meta === undefined ? undefined : redactSecrets(meta));
  }
}

const consoleSink: LogSink = {
  write(level, message, meta) {
    const line = `[${level.toUpperCase()}] ${message}`;
    const args = meta === undefined ? [line] : [line, meta];
    if (level === "error") {
      console.error(...args);
    } else if (level === "warn") {
      console.warn(...args);
    } else {
      console.log(...args);
    }
  },
};
