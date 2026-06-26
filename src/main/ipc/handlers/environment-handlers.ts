import {
  checkEnvironment,
  installPlan,
  type ToolRunner,
} from "../../infrastructure/python/environment.js";
import type { IpcRegistry } from "../typed-ipc.js";

// Registers the `env:*` IPC handlers (PRD §14). A thin transport adapter that
// probes the toolchain via the injected tool runner and venv check (both
// resolved at the composition root) and returns the status report plus the
// install plan.
export interface EnvironmentHandlerDeps {
  readonly toolRunner: ToolRunner;
  /** Detects a project-local `.venv` for the given Robot path. */
  readonly venvPresent: (root: string | null) => boolean;
}

export function registerEnvironmentHandlers(
  registry: IpcRegistry,
  deps: EnvironmentHandlerDeps,
): void {
  registry.handle("env:check", (request) => {
    const report = checkEnvironment(deps.toolRunner, deps.venvPresent(request.root));
    return { report, plan: installPlan(report) };
  });
}
