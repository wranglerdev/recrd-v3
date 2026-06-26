import { describe, expect, it, vi } from "vitest";
import { registerGitHandlers } from "@main/ipc/handlers/git-handlers";
import { IpcRegistry } from "@main/ipc/typed-ipc";
import { GitService, type GitServiceFactory } from "@main/infrastructure/git/git-service";
import type { ExternalOpener } from "@main/infrastructure/shell/external-opener";

function factoryFor(service: Partial<GitService>): GitServiceFactory {
  return vi.fn(() => service as GitService);
}

describe("registerGitHandlers", () => {
  it("returns the parsed status for a real repository", async () => {
    const status = { branch: "main", changes: [{ path: "a.txt", status: "modified" as const }] };
    const gitFactory = factoryFor({
      isRepository: () => true,
      getStatus: () => status,
    });
    const externalOpener: ExternalOpener = { openPath: vi.fn(async () => undefined) };
    const registry = new IpcRegistry();
    registerGitHandlers(registry, { gitFactory, externalOpener });

    await expect(registry.dispatch("git:status", { cwd: "/repo" })).resolves.toEqual({
      isRepository: true,
      branch: "main",
      changes: [{ path: "a.txt", status: "modified" }],
    });
    expect(gitFactory).toHaveBeenCalledWith("/repo");
  });

  it("reports a non-repository path without throwing", async () => {
    const gitFactory = factoryFor({ isRepository: () => false });
    const externalOpener: ExternalOpener = { openPath: vi.fn(async () => undefined) };
    const registry = new IpcRegistry();
    registerGitHandlers(registry, { gitFactory, externalOpener });

    await expect(registry.dispatch("git:status", { cwd: "/tmp" })).resolves.toEqual({
      isRepository: false,
      branch: "",
      changes: [],
    });
  });

  it("delegates git:openExternal to the external opener", async () => {
    const gitFactory = factoryFor({ isRepository: () => false });
    const externalOpener: ExternalOpener = { openPath: vi.fn(async () => undefined) };
    const registry = new IpcRegistry();
    registerGitHandlers(registry, { gitFactory, externalOpener });

    await registry.dispatch("git:openExternal", { cwd: "/repo" });
    expect(externalOpener.openPath).toHaveBeenCalledWith("/repo");
  });
});
