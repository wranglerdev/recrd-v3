import { randomUUID } from "node:crypto";
import { createProjectUseCases } from "../../application/project/project-service.js";
import type { UserContext } from "../../domain/auth/user-context.js";
import type { AppInfo } from "../../shared/ipc-contract.js";
import { Container } from "../di/container.js";
import {
  AppInfoToken,
  AppPathsToken,
  ConfigStoreToken,
  DatabaseToken,
  GitServiceFactoryToken,
  LoggerToken,
  ProjectUseCasesToken,
  RepositoriesToken,
  RobotProjectServiceToken,
  RobotRunnerToken,
  SandboxViewFactoryToken,
  ToolRunnerToken,
  UserContextToken,
} from "../di/tokens.js";
import type { AppSettings, ConfigStore } from "../infrastructure/config/config-store.js";
import type { DatabaseHandle } from "../infrastructure/db/connection.js";
import { createRepositories } from "../infrastructure/db/repositories.js";
import { createGitService } from "../infrastructure/git/git-service.js";
import type { Logger } from "../infrastructure/logging/logger.js";
import type { AppPaths } from "../infrastructure/paths/app-paths.js";
import { nodeToolRunner } from "../infrastructure/python/environment.js";
import { createRobotProjectService } from "../infrastructure/robot/robot-project.js";
import { RobotRunner } from "../infrastructure/robot/robot-runner.js";
import type { SandboxViewFactory } from "../sandbox/sandbox-config.js";
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

/**
 * Electron-coupled infrastructure constructed by main.ts at bootstrap and handed
 * to {@link registerInfrastructure}: the SQLite handle (opened against userData,
 * so it must not be opened in pure unit code) and the sandbox-view factory (which
 * pulls in Electron's BrowserView).
 */
export interface InfrastructureServices {
  readonly database: DatabaseHandle;
  readonly sandboxViewFactory: SandboxViewFactory;
}

/**
 * Registers the infrastructure layer into the container (PRD §3, §31): the
 * database handle + repositories, a project-scoped Git service factory, the
 * Python/Robot tool runner, the Robot project service and runner, and the
 * sandbox-view factory. Repositories and the Robot runner are lazy factories so
 * they are only constructed when first resolved.
 */
export function registerInfrastructure(
  container: Container,
  services: InfrastructureServices,
): Container {
  container.register(DatabaseToken, { useValue: services.database });
  container.register(RepositoriesToken, {
    useFactory: (c) => createRepositories(c.resolve(DatabaseToken).db),
  });
  container.register(GitServiceFactoryToken, { useValue: createGitService });
  container.register(ToolRunnerToken, { useValue: nodeToolRunner });
  container.register(RobotProjectServiceToken, { useValue: createRobotProjectService() });
  container.register(RobotRunnerToken, { useFactory: () => new RobotRunner() });
  container.register(SandboxViewFactoryToken, { useValue: services.sandboxViewFactory });
  return container;
}

/**
 * Registers the application use cases (PRD §6, §16), wiring them from the
 * infrastructure repositories and the core user context. Lazy factories so a use
 * case is only built when first resolved. Must run after {@link composeContainer}
 * and {@link registerInfrastructure}, whose tokens it depends on.
 */
export function registerUseCases(container: Container): Container {
  container.register(ProjectUseCasesToken, {
    useFactory: (c) =>
      createProjectUseCases({
        repository: c.resolve(RepositoriesToken).projects,
        userContext: c.resolve(UserContextToken),
        newId: randomUUID,
        clock: () => new Date(),
      }),
  });
  return container;
}

/** Builds the typed IPC registry, resolving handler dependencies from the container. */
export function buildIpcRegistry(container: Container): IpcRegistry {
  const registry = new IpcRegistry();
  registerAppHandlers(registry, container.resolve(AppInfoToken));
  return registry;
}
