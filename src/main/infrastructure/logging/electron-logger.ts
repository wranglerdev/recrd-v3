import log from "electron-log/main";
import type { AppPaths } from "../paths/app-paths.js";
import { SinkLogger, type LogLevel, type LogSink, type Logger } from "./logger.js";

// electron-log transport wired into the userData layout (PRD §4: logs/app.log).
// Imported only from the main-process composition root; the rest of the app
// depends on the `Logger` interface. Metadata redaction is handled by SinkLogger
// before anything reaches this sink (PRD §18).

function createElectronLogSink(paths: AppPaths, level: LogLevel): LogSink {
  log.initialize();
  log.transports.file.resolvePathFn = () => paths.appLog;
  log.transports.file.level = level;
  log.transports.console.level = level;
  return {
    write(lvl, message, meta) {
      if (meta === undefined) {
        log[lvl](message);
      } else {
        log[lvl](message, meta);
      }
    },
  };
}

/** Builds the production logger backed by electron-log. */
export function createElectronLogger(paths: AppPaths, level: LogLevel = "info"): Logger {
  return new SinkLogger({ level, sink: createElectronLogSink(paths, level) });
}
