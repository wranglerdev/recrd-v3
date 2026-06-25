import { describe, expect, it } from "vitest";
import { buildIpcRegistry, composeContainer, type CoreServices } from "@main/app/compose";
import { AppInfoToken, ConfigStoreToken, LoggerToken, UserContextToken } from "@main/di/tokens";
import {
  DEFAULT_SETTINGS,
  InMemoryConfigStore,
  type AppSettings,
} from "@main/infrastructure/config/config-store";
import { MockUserContext } from "@main/infrastructure/auth/mock-user-context";
import { SinkLogger } from "@main/infrastructure/logging/logger";
import { createAppPaths } from "@main/infrastructure/paths/app-paths";

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

describe("buildIpcRegistry", () => {
  it("registers the app:getInfo handler serving the injected app info", async () => {
    const services = fakeServices();
    const container = composeContainer(services);
    const registry = buildIpcRegistry(container);

    expect(registry.has("app:getInfo")).toBe(true);
    await expect(registry.dispatch("app:getInfo", undefined)).resolves.toEqual(services.appInfo);
  });
});
