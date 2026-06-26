import type { InstallUseCases } from "../../../application/environment/install-service.js";
import {
  checkEnvironment,
  installPlan,
  type ToolRunner,
} from "../../infrastructure/python/environment.js";
import type { IpcRegistry } from "../typed-ipc.js";

// Registers the `env:*` IPC handlers (PRD §14). A thin transport adapter that
// probes the toolchain via the injected tool runner and venv check (both
// resolved at the composition root). `env:check` returns the status report plus
// the install plan; `env:install` kicks off the plan (streaming progress over the
// `env:install:*` events). The plan is always recomputed here — renderer-supplied
// commands are never executed (PRD §18).
export interface EnvironmentHandlerDeps {
  readonly toolRunner: ToolRunner;
  /** Detects a project-local `.venv` for the given Robot path. */
  readonly venvPresent: (root: string | null) => boolean;
  readonly install: InstallUseCases;
}

export function registerEnvironmentHandlers(
  registry: IpcRegistry,
  deps: EnvironmentHandlerDeps,
): void {
  const planFor = (root: string | null): string[] =>
    installPlan(checkEnvironment(deps.toolRunner, deps.venvPresent(root)));

  registry.handle("env:check", (request) => {
    const report = checkEnvironment(deps.toolRunner, deps.venvPresent(request.root));
    return { report, plan: installPlan(report) };
  });

  registry.handle("env:install", (request) => {
    if (deps.install.isRunning()) {
      return { started: false, reason: "Instalação já em andamento." };
    }
    const plan = planFor(request.root);
    if (plan.length === 0) {
      return { started: false, reason: "Ambiente já está pronto." };
    }
    // Fire-and-forget: progress streams over env:install:* events.
    void deps.install.run(plan, request.root);
    return { started: true };
  });
}
