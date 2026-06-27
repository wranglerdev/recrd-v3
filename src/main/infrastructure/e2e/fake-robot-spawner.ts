import type { ChildLike, ReadableLike, RobotSpawner } from "../robot/robot-runner.js";

// Deterministic Robot-run seam for E2E (electron-bzv.3). A real Robot Framework
// run needs the Python venv installed and is slow/flaky in CI, so main.ts injects
// a RobotRunner backed by this fake spawner when RECRD_E2E_FAKE_RUNNER is set: it
// drives the runner's stdout/close callbacks with scripted lines and a chosen exit
// code, asynchronously, so an Execution row, result badge, log file and history
// entry can be asserted without a real toolchain. Production never constructs it.

export interface FakeRobotRunConfig {
  /** Lines streamed over stdout, in order, before the run closes. */
  readonly lines: readonly string[];
  /** Exit code reported on close (0 → Aprovado, non-zero → Falhou). */
  readonly exitCode: number;
}

/**
 * Builds a {@link RobotSpawner} whose child emits the configured lines then closes
 * with the configured exit code. Emission is deferred to a microtask so the
 * RobotRunner has registered its `data`/`close` listeners first, mirroring the
 * async arrival of a real child process's output.
 */
export function createFakeRobotSpawner(config: FakeRobotRunConfig): RobotSpawner {
  return () => {
    const dataListeners: ((chunk: string) => void)[] = [];
    const closeListeners: ((code: number | null) => void)[] = [];

    const stdout: ReadableLike = {
      on: (_event, listener) => dataListeners.push(listener),
    };

    const child: ChildLike = {
      stdout,
      stderr: null,
      on: (_event, listener) => closeListeners.push(listener),
      kill: () => true,
    };

    queueMicrotask(() => {
      for (const line of config.lines) {
        for (const listener of dataListeners) {
          listener(`${line}\n`);
        }
      }
      for (const listener of closeListeners) {
        listener(config.exitCode);
      }
    });

    return child;
  };
}
