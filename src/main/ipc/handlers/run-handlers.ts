import type { ProjectUseCases } from "../../../application/project/project-service.js";
import type { IpcEventEmitter } from "../ipc-event-emitter.js";
import type { IpcRegistry } from "../typed-ipc.js";

// Registers the `run:*` IPC handlers (PRD §15). Starts/stops a Robot run via the
// injected runner (the DI-registered RobotRunner) and forwards its stdout to the
// renderer line-by-line over the `run:line`/`run:exit` events. Pause maps to Stop
// upstream. A thin transport adapter — all collaborators are injected.

/** The subset of the RobotRunner this handler drives. */
export interface RobotRunController {
  isRunning(): boolean;
  start(
    options: { cwd: string; testPath: string },
    events: { onLine?: (line: string) => void; onExit?: (exitCode: number) => void },
  ): void;
  stop(): void;
}

export interface RunHandlerDeps {
  readonly runner: RobotRunController;
  readonly emitter: IpcEventEmitter;
  readonly projects: Pick<ProjectUseCases, "open">;
}

export function registerRunHandlers(registry: IpcRegistry, deps: RunHandlerDeps): void {
  registry.handle("run:start", (request) => {
    if (deps.runner.isRunning()) {
      return { started: false, reason: "Execução já em andamento." };
    }
    // `open` throws (mapped to an IPC error) when the project does not exist.
    const project = deps.projects.open(request.projectId);
    if (project.robotPath === null) {
      return { started: false, reason: "Projeto sem repositório Robot configurado." };
    }
    deps.runner.start(
      { cwd: project.robotPath, testPath: "tests" },
      {
        onLine: (line) => deps.emitter.emit("run:line", { line }),
        onExit: (exitCode) => deps.emitter.emit("run:exit", { exitCode }),
      },
    );
    return { started: true };
  });

  registry.handle("run:stop", () => deps.runner.stop());
}
