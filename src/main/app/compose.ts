import { randomUUID } from "node:crypto";
import {
  createCaseUseCases,
  createPlanUseCases,
  createSuiteUseCases,
} from "../../application/hierarchy/hierarchy-service.js";
import { createCompileUseCases } from "../../application/compile/compile-service.js";
import { createMassUseCases } from "../../application/mass/mass-service.js";
import { createProjectUseCases } from "../../application/project/project-service.js";
import { createRobotProjectUseCases } from "../../application/robot/robot-project-service.js";
import type { UserContext } from "../../domain/auth/user-context.js";
import type { AppInfo } from "../../shared/ipc-contract.js";
import type { VersionInfo } from "../../shared/version-info.js";
import { Container } from "../di/container.js";
import {
  AppInfoToken,
  AppPathsToken,
  CaseUseCasesToken,
  CompileUseCasesToken,
  ConfigStoreToken,
  CsvFileDialogToken,
  DatabaseToken,
  DirectoryDialogToken,
  ExternalOpenerToken,
  GitServiceFactoryToken,
  LoggerToken,
  MassUseCasesToken,
  PlanUseCasesToken,
  ProjectUseCasesToken,
  RepositoriesToken,
  RobotFileWriterToken,
  RobotProjectServiceToken,
  RobotProjectUseCasesToken,
  RobotRunnerToken,
  SandboxViewFactoryToken,
  SuiteUseCasesToken,
  ToolRunnerToken,
  UserContextToken,
  VersionInfoToken,
} from "../di/tokens.js";
import type { AppSettings, ConfigStore } from "../infrastructure/config/config-store.js";
import type { DatabaseHandle } from "../infrastructure/db/connection.js";
import { createMassRepository } from "../infrastructure/db/mass-repository.js";
import { createRepositories } from "../infrastructure/db/repositories.js";
import { createCompiledScriptRepository } from "../infrastructure/db/script-repository.js";
import type { CsvFileDialog } from "../infrastructure/dialog/csv-file-dialog.js";
import type { DirectoryDialog } from "../infrastructure/dialog/directory-dialog.js";
import { createGitService } from "../infrastructure/git/git-service.js";
import type { ExternalOpener } from "../infrastructure/shell/external-opener.js";
import type { Logger } from "../infrastructure/logging/logger.js";
import type { AppPaths } from "../infrastructure/paths/app-paths.js";
import { nodeToolRunner } from "../infrastructure/python/environment.js";
import { createRobotFileWriter } from "../infrastructure/robot/robot-file-writer.js";
import { createRobotProjectService } from "../infrastructure/robot/robot-project.js";
import { RobotRunner } from "../infrastructure/robot/robot-runner.js";
import type { SandboxViewFactory } from "../sandbox/sandbox-config.js";
import { registerAppHandlers } from "../ipc/handlers/app-handlers.js";
import { registerCompileHandlers } from "../ipc/handlers/compile-handlers.js";
import { registerDialogHandlers } from "../ipc/handlers/dialog-handlers.js";
import { registerHierarchyHandlers } from "../ipc/handlers/hierarchy-handlers.js";
import { registerMassHandlers } from "../ipc/handlers/mass-handlers.js";
import { registerGitHandlers } from "../ipc/handlers/git-handlers.js";
import { registerProjectHandlers } from "../ipc/handlers/project-handlers.js";
import { registerRobotHandlers } from "../ipc/handlers/robot-handlers.js";
import { registerSettingsHandlers } from "../ipc/handlers/settings-handlers.js";
import { IpcRegistry } from "../ipc/typed-ipc.js";

// Composition root wiring (PRD §3, §31). Kept free of Electron lifecycle code so
// it is unit-testable: the concrete services are constructed by main.ts (with
// electron-store / electron-log) and injected here.

export interface CoreServices {
  readonly paths: AppPaths;
  readonly logger: Logger;
  readonly config: ConfigStore<AppSettings>;
  readonly appInfo: AppInfo;
  readonly versionInfo: VersionInfo;
  readonly userContext: UserContext;
}

/** Registers the core services into a fresh DI container. */
export function composeContainer(services: CoreServices): Container {
  const container = new Container();
  container.register(AppPathsToken, { useValue: services.paths });
  container.register(LoggerToken, { useValue: services.logger });
  container.register(ConfigStoreToken, { useValue: services.config });
  container.register(AppInfoToken, { useValue: services.appInfo });
  container.register(VersionInfoToken, { useValue: services.versionInfo });
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
  readonly csvFileDialog: CsvFileDialog;
  readonly directoryDialog: DirectoryDialog;
  readonly externalOpener: ExternalOpener;
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
  container.register(RobotFileWriterToken, { useValue: createRobotFileWriter() });
  container.register(RobotRunnerToken, { useFactory: () => new RobotRunner() });
  container.register(SandboxViewFactoryToken, { useValue: services.sandboxViewFactory });
  container.register(CsvFileDialogToken, { useValue: services.csvFileDialog });
  container.register(DirectoryDialogToken, { useValue: services.directoryDialog });
  container.register(ExternalOpenerToken, { useValue: services.externalOpener });
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
  container.register(RobotProjectUseCasesToken, {
    useFactory: (c) =>
      createRobotProjectUseCases({
        scaffolder: c.resolve(RobotProjectServiceToken),
        projects: c.resolve(ProjectUseCasesToken),
      }),
  });
  // Hierarchy use cases (Plan > Suite > Case). Each guards parent existence via a
  // ParentCheck backed by the parent repository's findById (hierarchy integrity).
  container.register(PlanUseCasesToken, {
    useFactory: (c) => {
      const repos = c.resolve(RepositoriesToken);
      return createPlanUseCases({
        repository: repos.plans,
        projectExists: (id) => repos.projects.findById(id) !== undefined,
        userContext: c.resolve(UserContextToken),
        newId: randomUUID,
        clock: () => new Date(),
      });
    },
  });
  container.register(SuiteUseCasesToken, {
    useFactory: (c) => {
      const repos = c.resolve(RepositoriesToken);
      return createSuiteUseCases({
        repository: repos.suites,
        planExists: (id) => repos.plans.findById(id) !== undefined,
        userContext: c.resolve(UserContextToken),
        newId: randomUUID,
        clock: () => new Date(),
      });
    },
  });
  container.register(CaseUseCasesToken, {
    useFactory: (c) => {
      const repos = c.resolve(RepositoriesToken);
      return createCaseUseCases({
        repository: repos.cases,
        suiteExists: (id) => repos.suites.findById(id) !== undefined,
        userContext: c.resolve(UserContextToken),
        newId: randomUUID,
        clock: () => new Date(),
      });
    },
  });
  container.register(MassUseCasesToken, {
    useFactory: (c) => {
      const repos = c.resolve(RepositoriesToken);
      return createMassUseCases({
        repository: createMassRepository(repos.masses),
        projectExists: (id) => repos.projects.findById(id) !== undefined,
        userContext: c.resolve(UserContextToken),
        newId: randomUUID,
        clock: () => new Date(),
      });
    },
  });
  container.register(CompileUseCasesToken, {
    useFactory: (c) =>
      createCompileUseCases({
        scripts: createCompiledScriptRepository(c.resolve(RepositoriesToken).scripts),
        robotFiles: c.resolve(RobotFileWriterToken),
        projects: c.resolve(ProjectUseCasesToken),
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
  registerAppHandlers(
    registry,
    container.resolve(AppInfoToken),
    container.resolve(VersionInfoToken),
  );
  registerRobotHandlers(registry, container.resolve(RobotProjectUseCasesToken));
  registerProjectHandlers(registry, container.resolve(ProjectUseCasesToken));
  registerHierarchyHandlers(registry, {
    plans: container.resolve(PlanUseCasesToken),
    suites: container.resolve(SuiteUseCasesToken),
    cases: container.resolve(CaseUseCasesToken),
  });
  registerMassHandlers(registry, {
    masses: container.resolve(MassUseCasesToken),
    csvFileDialog: container.resolve(CsvFileDialogToken),
  });
  registerCompileHandlers(registry, container.resolve(CompileUseCasesToken));
  registerDialogHandlers(registry, container.resolve(DirectoryDialogToken));
  registerSettingsHandlers(registry, container.resolve(ConfigStoreToken));
  registerGitHandlers(registry, {
    gitFactory: container.resolve(GitServiceFactoryToken),
    externalOpener: container.resolve(ExternalOpenerToken),
  });
  return registry;
}
