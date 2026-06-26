// Environment install orchestration (PRD §14). Runs the install plan commands
// (venv, robotframework, robotframework-browser, rfbrowser init) one after
// another in the project's Robot directory, streaming each command's output and
// stopping at the first failure. Pure orchestration over injected ports — a
// streaming command runner (infrastructure: spawns processes) and a progress
// sink (forwards events to the renderer over IPC) — so the sequencing logic stays
// free of Node/Electron and is unit-testable.

/**
 * Runs a single shell command line in `cwd`, invoking `onLine` per output line,
 * and resolves with the process exit code. Implemented by infrastructure (spawn).
 */
export type StreamingCommandRunner = (
  commandLine: string,
  cwd: string,
  onLine: (line: string) => void,
) => Promise<number>;

/** Sink for install progress, forwarded to the renderer as IPC events. */
export interface InstallProgress {
  line(line: string): void;
  done(ok: boolean, failedCommand: string | null): void;
}

export interface InstallUseCaseDeps {
  readonly runner: StreamingCommandRunner;
  readonly progress: InstallProgress;
}

export interface InstallUseCases {
  /** True while an install is in progress (only one runs at a time). */
  isRunning(): boolean;
  /**
   * Runs the plan commands sequentially in `cwd`, streaming output and emitting a
   * single `done` at the end. Stops at the first non-zero exit. A no-op (already
   * resolves `done(true)`) for an empty plan; ignored if already running.
   */
  run(plan: readonly string[], cwd: string): Promise<void>;
}

export function createInstallUseCases(deps: InstallUseCaseDeps): InstallUseCases {
  const { runner, progress } = deps;
  let running = false;

  return {
    isRunning: () => running,
    async run(plan, cwd) {
      if (running) {
        return;
      }
      running = true;
      try {
        for (const commandLine of plan) {
          progress.line(`$ ${commandLine}`);
          const exitCode = await runner(commandLine, cwd, (line) => progress.line(line));
          if (exitCode !== 0) {
            progress.done(false, commandLine);
            return;
          }
        }
        progress.done(true, null);
      } finally {
        running = false;
      }
    },
  };
}
