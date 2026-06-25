// Main-process infrastructure: userData paths, logging and config (PRD §4, §31).
export { createAppPaths, ensureAppDirectories, type AppPaths } from "./paths/app-paths.js";
export { SinkLogger, type Logger, type LogLevel, type LogSink } from "./logging/logger.js";
export { redactSecrets } from "./logging/redact.js";
export { createElectronLogger } from "./logging/electron-logger.js";
export {
  DEFAULT_SETTINGS,
  InMemoryConfigStore,
  type AppSettings,
  type ConfigStore,
  type WindowState,
} from "./config/config-store.js";
export { ElectronStoreConfig } from "./config/electron-store-config.js";
