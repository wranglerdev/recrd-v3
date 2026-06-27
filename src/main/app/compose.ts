import { randomUUID } from "node:crypto";
import {
  createCaseUseCases,
  createPlanUseCases,
  createSuiteUseCases,
} from "../../application/hierarchy/hierarchy-service.js";
import { createCompileUseCases } from "../../application/compile/compile-service.js";
import { createExecutionUseCases } from "../../application/execution/execution-service.js";
import { createExportUseCases } from "../../application/export/export-service.js";
import { createScriptUseCases } from "../../application/scripts/script-service.js";
import {
  createInstallUseCases,
  type InstallProgress,
  type StreamingCommandRunner,
} from "../../application/environment/install-service.js";
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
  AuditTrailToken,
  CaseUseCasesToken,
  CompileUseCasesToken,
  ConfigStoreToken,
  EventEmitterToken,
  ExecutionUseCasesToken,
  ExportUseCasesToken,
  InstallCommandRunnerToken,
  InstallUseCasesToken,
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
  ScriptUseCasesToken,
  SandboxControllerToken,
  SandboxViewFactoryToken,
  SuiteUseCasesToken,
  ToolRunnerToken,
  UserContextToken,
  VersionInfoToken,
} from "../di/tokens.js";
import type { AppSettings, ConfigStore } from "../infrastructure/config/config-store.js";
import type { DatabaseHandle } from "../infrastructure/db/connection.js";
import { createAuditTrail } from "../infrastructure/db/audit-event-repository.js";
import { createExecutionLogWriter } from "../infrastructure/execution/execution-log-writer.js";
import {
  createExecutionLogSource,
  createManualScriptSource,
} from "../infrastructure/db/export-sources.js";
import { createExportEnvironment } from "../infrastructure/fs/node-export-environment.js";
import { createManualScriptStore } from "../infrastructure/db/manual-script-repository.js";
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
import { directoryHasVenv } from "../infrastructure/python/venv-probe.js";
import { createRobotFileWriter } from "../infrastructure/robot/robot-file-writer.js";
import { createRobotProjectService } from "../infrastructure/robot/robot-project.js";
import { RobotRunner } from "../infrastructure/robot/robot-runner.js";
import type { SandboxController } from "../../application/sandbox/sandbox-controller.js";
import type { SandboxViewFactory } from "../sandbox/sandbox-config.js";
import { registerAppHandlers } from "../ipc/handlers/app-handlers.js";
import { registerAuditHandlers } from "../ipc/handlers/audit-handlers.js";
import { registerCompileHandlers } from "../ipc/handlers/compile-handlers.js";
import { registerDialogHandlers } from "../ipc/handlers/dialog-handlers.js";
import { registerExecutionHandlers } from "../ipc/handlers/execution-handlers.js";
import { registerExportHandlers } from "../ipc/handlers/export-handlers.js";
import { registerSandboxHandlers } from "../ipc/handlers/sandbox-handlers.js";
import { registerScriptHandlers } from "../ipc/handlers/script-handlers.js";
import { registerEnvironmentHandlers } from "../ipc/handlers/environment-handlers.js";
import { registerRunHandlers } from "../ipc/handlers/run-handlers.js";
import type { SettableIpcEventEmitter } from "../ipc/ipc-event-emitter.js";
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
  /** Coordinates the embedded Browser Sandbox view; its view port is attached after the window opens. */
  readonly sandboxController: SandboxController;
  readonly csvFileDialog: CsvFileDialog;
  readonly directoryDialog: DirectoryDialog;
  readonly externalOpener: ExternalOpener;
  /** Pushes streamed events to the renderer; target attached after the window opens. */
  readonly eventEmitter: SettableIpcEventEmitter;
  /** Runs install-plan commands, streaming their output (spawn-backed). */
  readonly installCommandRunner: StreamingCommandRunner;
  /**
   * Robot runner to register. Optional: production omits it and a real
   * spawn-backed {@link RobotRunner} is built lazily; the E2E harness injects a
   * RobotRunner driven by a deterministic fake spawner (electron-bzv.3).
   */
  readonly robotRunner?: RobotRunner;
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
  // Persistent audit trail (PRD §16): a lazy singleton over the audit_events
  // repository, recorded into by the mutating use cases and read by audit:list.
  container.register(AuditTrailToken, {
    useFactory: (c) => createAuditTrail(c.resolve(RepositoriesToken).auditEvents, randomUUID),
  });
  container.register(RobotRunnerToken, {
    useFactory: () => services.robotRunner ?? new RobotRunner(),
  });
  container.register(SandboxViewFactoryToken, { useValue: services.sandboxViewFactory });
  container.register(SandboxControllerToken, { useValue: services.sandboxController });
  container.register(CsvFileDialogToken, { useValue: services.csvFileDialog });
  container.register(DirectoryDialogToken, { useValue: services.directoryDialog });
  container.register(ExternalOpenerToken, { useValue: services.externalOpener });
  container.register(EventEmitterToken, { useValue: services.eventEmitter });
  container.register(InstallCommandRunnerToken, { useValue: services.installCommandRunner });
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
        inspector: c.resolve(RobotProjectServiceToken),
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
        audit: c.resolve(AuditTrailToken),
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
        audit: c.resolve(AuditTrailToken),
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
        audit: c.resolve(AuditTrailToken),
      }),
  });
  container.register(ExecutionUseCasesToken, {
    useFactory: (c) => {
      const repos = c.resolve(RepositoriesToken);
      return createExecutionUseCases({
        repository: repos.executions,
        caseName: (caseId) => repos.cases.findById(caseId)?.name,
        userContext: c.resolve(UserContextToken),
        newId: randomUUID,
        saveLog: createExecutionLogWriter(c.resolve(AppPathsToken).executionsDir),
      });
    },
  });
  container.register(ExportUseCasesToken, {
    useFactory: (c) => {
      const repos = c.resolve(RepositoriesToken);
      return createExportUseCases({
        manualScript: createManualScriptSource(repos),
        executionLog: createExecutionLogSource(repos),
        env: createExportEnvironment(c.resolve(AppPathsToken)),
        userContext: c.resolve(UserContextToken),
        clock: () => new Date(),
        audit: c.resolve(AuditTrailToken),
      });
    },
  });
  container.register(ScriptUseCasesToken, {
    useFactory: (c) =>
      createScriptUseCases({
        store: createManualScriptStore(c.resolve(RepositoriesToken).scripts),
        userContext: c.resolve(UserContextToken),
        newId: randomUUID,
        clock: () => new Date(),
        audit: c.resolve(AuditTrailToken),
      }),
  });
  container.register(InstallUseCasesToken, {
    useFactory: (c) => {
      const emitter = c.resolve(EventEmitterToken);
      const progress: InstallProgress = {
        line: (line) => emitter.emit("env:install:line", { line }),
        done: (ok, failedCommand) => emitter.emit("env:install:done", { ok, failedCommand }),
      };
      return createInstallUseCases({ runner: c.resolve(InstallCommandRunnerToken), progress });
    },
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
  registerAuditHandlers(registry, container.resolve(AuditTrailToken));
  registerExecutionHandlers(registry, container.resolve(ExecutionUseCasesToken));
  registerExportHandlers(registry, container.resolve(ExportUseCasesToken));
  registerSandboxHandlers(registry, container.resolve(SandboxControllerToken));
  registerScriptHandlers(registry, container.resolve(ScriptUseCasesToken));
  registerEnvironmentHandlers(registry, {
    toolRunner: container.resolve(ToolRunnerToken),
    venvPresent: directoryHasVenv,
    install: container.resolve(InstallUseCasesToken),
  });
  registerRunHandlers(registry, {
    runner: container.resolve(RobotRunnerToken),
    emitter: container.resolve(EventEmitterToken),
    projects: container.resolve(ProjectUseCasesToken),
    executions: container.resolve(ExecutionUseCasesToken),
    clock: () => new Date(),
  });
  return registry;
}
