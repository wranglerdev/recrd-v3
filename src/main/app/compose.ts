import type { UserContext } from "../../domain/auth/user-context.js";
import type { AppInfo } from "../../shared/ipc-contract.js";
import { Container } from "../di/container.js";
import {
  AppInfoToken,
  AppPathsToken,
  ConfigStoreToken,
  LoggerToken,
  UserContextToken,
} from "../di/tokens.js";
import type { AppSettings, ConfigStore } from "../infrastructure/config/config-store.js";
import type { Logger } from "../infrastructure/logging/logger.js";
import type { AppPaths } from "../infrastructure/paths/app-paths.js";
import { registerAppHandlers } from "../ipc/handlers/app-handlers.js";
import { IpcRegistry } from "../ipc/typed-ipc.js";

// Composition root wiring (PRD §3, §31). Kept free of Electron lifecycle code so
// it is unit-testable: the concrete services are constructed by main.ts (with
// electron-store / electron-log) and injected here.

export interface CoreServices {
  readonly paths: AppPaths;
  readonly logger: Logger;
  readonly config: ConfigStore<AppSettings>;
  readonly appInfo: AppInfo;
  readonly userContext: UserContext;
}

/** Registers the core services into a fresh DI container. */
export function composeContainer(services: CoreServices): Container {
  const container = new Container();
  container.register(AppPathsToken, { useValue: services.paths });
  container.register(LoggerToken, { useValue: services.logger });
  container.register(ConfigStoreToken, { useValue: services.config });
  container.register(AppInfoToken, { useValue: services.appInfo });
  container.register(UserContextToken, { useValue: services.userContext });
  return container;
}

/** Builds the typed IPC registry, resolving handler dependencies from the container. */
export function buildIpcRegistry(container: Container): IpcRegistry {
  const registry = new IpcRegistry();
  registerAppHandlers(registry, container.resolve(AppInfoToken));
  return registry;
}
