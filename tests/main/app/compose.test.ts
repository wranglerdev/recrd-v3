import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  buildIpcRegistry,
  composeContainer,
  registerInfrastructure,
  registerUseCases,
  type CoreServices,
} from "@main/app/compose";
import {
  AppInfoToken,
  AuditTrailToken,
  CaseUseCasesToken,
  CompileUseCasesToken,
  ConfigStoreToken,
  DatabaseToken,
  ExecutionUseCasesToken,
  ExportUseCasesToken,
  InstallUseCasesToken,
  GitServiceFactoryToken,
  LoggerToken,
  MassUseCasesToken,
  PlanUseCasesToken,
  ProjectUseCasesToken,
  RepositoriesToken,
  RobotProjectServiceToken,
  RobotRunnerToken,
  SandboxViewFactoryToken,
  SuiteUseCasesToken,
  ToolRunnerToken,
  UserContextToken,
} from "@main/di/tokens";
import {
  DEFAULT_SETTINGS,
  InMemoryConfigStore,
  type AppSettings,
} from "@main/infrastructure/config/config-store";
import { MockUserContext } from "@main/infrastructure/auth/mock-user-context";
import { SinkLogger } from "@main/infrastructure/logging/logger";
import { createAppPaths } from "@main/infrastructure/paths/app-paths";
import { createDatabase } from "@main/infrastructure/db/connection";
import { GitService } from "@main/infrastructure/git/git-service";
import { RobotRunner } from "@main/infrastructure/robot/robot-runner";

function fakeServices(): CoreServices {
  return {
    paths: createAppPaths("/data/recrd"),
    logger: new SinkLogger({ sink: { write: () => undefined } }),
    config: new InMemoryConfigStore<AppSettings>(DEFAULT_SETTINGS),
    appInfo: { name: "recrd", version: "0.1.0", platform: "linux" },
    versionInfo: {
      version: "0.1.0",
      gitCommit: "abc1234",
      buildDate: "2026-06-26T00:00:00.000Z",
      target: "linux-x64",
    },
    userContext: new MockUserContext(),
  };
}

describe("composeContainer", () => {
  it("registers the core services so they can be resolved", () => {
    const services = fakeServices();
    const container = composeContainer(services);

    expect(container.resolve(AppInfoToken)).toEqual(services.appInfo);
    expect(container.resolve(LoggerToken)).toBe(services.logger);
    expect(container.resolve(ConfigStoreToken)).toBe(services.config);
    expect(container.resolve(UserContextToken)).toBe(services.userContext);
  });
});

describe("registerInfrastructure", () => {
  it("registers infrastructure services so they can be resolved", () => {
    const container = composeContainer(fakeServices());
    const database = createDatabase(":memory:");
    const sandboxViewFactory = vi.fn();
    try {
      registerInfrastructure(container, {
        database,
        sandboxViewFactory,
        csvFileDialog: { selectCsv: vi.fn(async () => null) },
        directoryDialog: { selectDirectory: vi.fn(async () => null) },
        externalOpener: { openPath: vi.fn(async () => undefined) },
        eventEmitter: { setTarget: vi.fn(), emit: vi.fn() },
        installCommandRunner: vi.fn(async () => 0),
      });

      expect(container.resolve(DatabaseToken)).toBe(database);

      // Repositories are a lazy factory built from the database handle.
      const repositories = container.resolve(RepositoriesToken);
      expect(repositories.projects).toBeDefined();
      expect(repositories.masses).toBeDefined();

      // Git is project-scoped: the token resolves a factory keyed by cwd.
      const gitFactory = container.resolve(GitServiceFactoryToken);
      expect(gitFactory("/repo")).toBeInstanceOf(GitService);

      // Tool runner + robot project service are concrete singletons.
      expect(typeof container.resolve(ToolRunnerToken)).toBe("function");
      expect(typeof container.resolve(RobotProjectServiceToken).create).toBe("function");

      // The robot runner is a lazy singleton.
      expect(container.resolve(RobotRunnerToken)).toBeInstanceOf(RobotRunner);

      // The sandbox-view factory is injected as a value by main.ts.
      expect(container.resolve(SandboxViewFactoryToken)).toBe(sandboxViewFactory);
    } finally {
      database.close();
    }
  });
});

describe("registerUseCases", () => {
  it("wires the Project use cases over the real repository + user context", () => {
    const services = fakeServices();
    const container = composeContainer(services);
    const database = createDatabase(":memory:");
    try {
      registerInfrastructure(container, {
        database,
        sandboxViewFactory: vi.fn(),
        csvFileDialog: { selectCsv: vi.fn(async () => null) },
        directoryDialog: { selectDirectory: vi.fn(async () => null) },
        externalOpener: { openPath: vi.fn(async () => undefined) },
        eventEmitter: { setTarget: vi.fn(), emit: vi.fn() },
        installCommandRunner: vi.fn(async () => 0),
      });
      registerUseCases(container);

      const projects = container.resolve(ProjectUseCasesToken);
      const created = projects.create({ name: "Banco XYZ" });

      // Audited with the injected user context and persisted via the repository.
      expect(created.name).toBe("Banco XYZ");
      expect(created.createdBy).toBe(services.userContext.username);
      expect(projects.list()).toHaveLength(1);
      expect(projects.open(created.id)).toEqual(created);
    } finally {
      database.close();
    }
  });

  it("wires the hierarchy, mass and compile use cases end to end", () => {
    const services = fakeServices();
    const container = composeContainer(services);
    const database = createDatabase(":memory:");
    const robotRoot = mkdtempSync(join(tmpdir(), "recrd-compose-"));
    try {
      registerInfrastructure(container, {
        database,
        sandboxViewFactory: vi.fn(),
        csvFileDialog: { selectCsv: vi.fn(async () => null) },
        directoryDialog: { selectDirectory: vi.fn(async () => null) },
        externalOpener: { openPath: vi.fn(async () => undefined) },
        eventEmitter: { setTarget: vi.fn(), emit: vi.fn() },
        installCommandRunner: vi.fn(async () => 0),
      });
      registerUseCases(container);

      // A project whose Robot tree lives in a real temp dir (compile writes there).
      const project = container.resolve(ProjectUseCasesToken).create({
        name: "Banco",
        robotPath: robotRoot,
      });

      // Plan > Suite > Case exercise each factory's parent-existence + clock closures.
      const plan = container.resolve(PlanUseCasesToken).create({
        projectId: project.id,
        name: "Plano",
      });
      const suite = container
        .resolve(SuiteUseCasesToken)
        .create({ planId: plan.id, name: "Suíte" });
      const testCase = container
        .resolve(CaseUseCasesToken)
        .create({ suiteId: suite.id, name: "Caso" });
      expect(testCase.suiteId).toBe(suite.id);

      const importResult = container.resolve(MassUseCasesToken).importCsv({
        projectId: project.id,
        name: "Massa",
        csv: "usuario,senha\nadmin,123",
        source: "x",
      });
      expect(importResult.ok).toBe(true);

      const compiled = container.resolve(CompileUseCasesToken).compileAndPersist({
        caseId: testCase.id,
        projectId: project.id,
        script: { name: "Login", actions: [{ type: "navigate", url: "https://example.com" }] },
      });
      expect(compiled.ok).toBe(true);
      if (compiled.ok) {
        expect(existsSync(compiled.robotFile)).toBe(true);
      }

      // The mutating use cases record into the shared persistent audit trail
      // (PRD §16): the case create, the mass import and the compile above.
      const events = container.resolve(AuditTrailToken).list();
      expect(events.map((event) => event.type).sort()).toEqual([
        "compile",
        "mass.import",
        "test.change",
      ]);

      // The execution use case reads persisted rows and resolves the case name.
      const repos = container.resolve(RepositoriesToken);
      repos.executions.create({
        id: "ex1",
        caseId: testCase.id,
        startedAt: "2026-06-26T10:00:00.000Z",
        result: "passed",
        durationMs: 1500,
        log: "",
        createdBy: "dev",
        createdAt: "2026-06-26T10:00:00.000Z",
        updatedBy: "dev",
        updatedAt: "2026-06-26T10:00:00.000Z",
      });
      const recent = container.resolve(ExecutionUseCasesToken).listRecent();
      expect(recent).toEqual([
        {
          id: "ex1",
          caseId: testCase.id,
          caseName: "Caso",
          result: "passed",
          startedAt: "2026-06-26T10:00:00.000Z",
          durationMs: 1500,
        },
      ]);
    } finally {
      database.close();
      rmSync(robotRoot, { recursive: true, force: true });
    }
  });

  it("wires the export use cases to write real artifacts", async () => {
    const base = mkdtempSync(join(tmpdir(), "recrd-export-"));
    const services: CoreServices = { ...fakeServices(), paths: createAppPaths(base) };
    const container = composeContainer(services);
    const database = createDatabase(":memory:");
    try {
      registerInfrastructure(container, {
        database,
        sandboxViewFactory: vi.fn(),
        csvFileDialog: { selectCsv: vi.fn(async () => null) },
        directoryDialog: { selectDirectory: vi.fn(async () => null) },
        externalOpener: { openPath: vi.fn(async () => undefined) },
        eventEmitter: { setTarget: vi.fn(), emit: vi.fn() },
        installCommandRunner: vi.fn(async () => 0),
      });
      registerUseCases(container);
      mkdirSync(services.paths.exportsDir, { recursive: true });

      // Seed a case with a manual script captured for it.
      const repos = container.resolve(RepositoriesToken);
      const project = container.resolve(ProjectUseCasesToken).create({ name: "Banco" });
      const plan = container.resolve(PlanUseCasesToken).create({
        projectId: project.id,
        name: "Plano",
      });
      const suite = container
        .resolve(SuiteUseCasesToken)
        .create({ planId: plan.id, name: "Suíte" });
      const testCase = container
        .resolve(CaseUseCasesToken)
        .create({ suiteId: suite.id, name: "Caso" });
      repos.scripts.create({
        id: "scr1",
        caseId: testCase.id,
        kind: "manual",
        content: JSON.stringify({ name: "Login", actions: [] }),
        createdBy: "dev",
        createdAt: "2026-06-26T10:00:00.000Z",
        updatedBy: "dev",
        updatedAt: "2026-06-26T10:00:00.000Z",
      });

      const exporter = container.resolve(ExportUseCasesToken);
      const jsonPath = await exporter.exportJson(testCase.id);
      expect(existsSync(jsonPath)).toBe(true);

      // The export is recorded into the shared audit trail.
      const events = container.resolve(AuditTrailToken).list();
      expect(events.some((event) => event.type === "export")).toBe(true);
    } finally {
      database.close();
      rmSync(base, { recursive: true, force: true });
    }
  });
});

describe("buildIpcRegistry", () => {
  it("registers the app:getInfo and robot:scaffold handlers", async () => {
    const services = fakeServices();
    const container = composeContainer(services);
    const database = createDatabase(":memory:");
    try {
      const emit = vi.fn();
      registerInfrastructure(container, {
        database,
        sandboxViewFactory: vi.fn(),
        csvFileDialog: { selectCsv: vi.fn(async () => null) },
        directoryDialog: { selectDirectory: vi.fn(async () => null) },
        externalOpener: { openPath: vi.fn(async () => undefined) },
        eventEmitter: { setTarget: vi.fn(), emit },
        installCommandRunner: vi.fn(async (_cmd, _cwd, onLine) => {
          onLine("output");
          return 0;
        }),
      });
      registerUseCases(container);
      const registry = buildIpcRegistry(container);

      expect(registry.has("app:getInfo")).toBe(true);
      await expect(registry.dispatch("app:getInfo", undefined)).resolves.toEqual(services.appInfo);

      // The robot scaffolding + linking handlers are wired from the container.
      expect(registry.has("robot:scaffold")).toBe(true);
      expect(registry.has("robot:linkExisting")).toBe(true);

      // Project + hierarchy (plan/suite/case) channels are wired too.
      for (const channel of [
        "project:create",
        "project:list",
        "plan:create",
        "suite:create",
        "case:create",
        "case:setStatus",
        "mass:import",
        "mass:listByProject",
        "mass:selectCsv",
        "compile:run",
        "dialog:selectDirectory",
        "settings:getAll",
        "git:status",
        "git:openExternal",
        "audit:list",
        "execution:listRecent",
        "env:check",
        "env:install",
        "run:start",
        "run:stop",
        "export:json",
        "export:robot",
        "export:log",
      ] as const) {
        expect(registry.has(channel)).toBe(true);
      }

      // Drive run:start once (stubbing the spawn) to cover the run-handler wiring.
      vi.spyOn(container.resolve(RobotRunnerToken), "start").mockReturnValue(undefined);
      const runProject = container
        .resolve(ProjectUseCasesToken)
        .create({ name: "Run", robotPath: "/tmp/run" });
      await expect(registry.dispatch("run:start", { projectId: runProject.id })).resolves.toEqual({
        started: true,
      });

      // The install use case forwards progress through the wired event emitter.
      await container.resolve(InstallUseCasesToken).run(["echo hi"], "/tmp");
      expect(emit).toHaveBeenCalledWith("env:install:line", { line: "$ echo hi" });
      expect(emit).toHaveBeenCalledWith("env:install:line", { line: "output" });
      expect(emit).toHaveBeenCalledWith("env:install:done", { ok: true, failedCommand: null });
    } finally {
      database.close();
    }
  });
});
