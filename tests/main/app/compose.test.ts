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
      registerInfrastructure(container, { database, sandboxViewFactory });

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
      registerInfrastructure(container, { database, sandboxViewFactory: vi.fn() });
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
});

describe("buildIpcRegistry", () => {
  it("registers the app:getInfo handler serving the injected app info", async () => {
    const services = fakeServices();
    const container = composeContainer(services);
    const registry = buildIpcRegistry(container);

    expect(registry.has("app:getInfo")).toBe(true);
    await expect(registry.dispatch("app:getInfo", undefined)).resolves.toEqual(services.appInfo);
  });
});
