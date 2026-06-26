import type { GitServiceFactory } from "../../infrastructure/git/git-service.js";
import type { ExternalOpener } from "../../infrastructure/shell/external-opener.js";
import type { IpcRegistry } from "../typed-ipc.js";

// Registers the `git:*` IPC handlers (PRD §14). Thin transport adapters over the
// project-scoped Git service factory and the external opener, both resolved from
// the container at the composition root.
export interface GitHandlerDeps {
  readonly gitFactory: GitServiceFactory;
  readonly externalOpener: ExternalOpener;
}

export function registerGitHandlers(registry: IpcRegistry, deps: GitHandlerDeps): void {
  const { gitFactory, externalOpener } = deps;

  registry.handle("git:status", (request) => {
    const git = gitFactory(request.cwd);
    // A non-repo path (or unset robotPath) yields an empty, "not a repository"
    // result rather than throwing, so the panel can render a clear message.
    if (!git.isRepository()) {
      return { isRepository: false, branch: "", changes: [] };
    }
    return { isRepository: true, ...git.getStatus() };
  });

  registry.handle("git:openExternal", (request) => externalOpener.openPath(request.cwd));
}
