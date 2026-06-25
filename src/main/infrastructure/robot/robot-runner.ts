import { spawn } from "node:child_process";

// Runs a Robot Framework test as a child process (PRD §15), streaming stdout
// line-by-line so the main process can forward it to the renderer over IPC. The
// spawner is injectable for testing. (A CLI run can be started/stopped/reloaded;
// pause is not supported by Robot, so Pause maps to Stop in the UI.)

export interface ReadableLike {
  on(event: "data", listener: (chunk: Buffer | string) => void): void;
}

export interface ChildLike {
  readonly stdout: ReadableLike | null;
  readonly stderr: ReadableLike | null;
  on(event: "close", listener: (code: number | null) => void): void;
  kill(signal?: NodeJS.Signals): boolean;
}

export type RobotSpawner = (command: string, args: string[], options: { cwd: string }) => ChildLike;

export type RobotRunOptions = {
  readonly cwd: string;
  readonly testPath: string;
};

export type RunnerEvents = {
  onLine?: (line: string) => void;
  onExit?: (exitCode: number) => void;
};

export const defaultRobotSpawner: RobotSpawner = (command, args, options) =>
  spawn(command, args, { cwd: options.cwd });

export class RobotRunner {
  private child: ChildLike | null = null;

  constructor(private readonly spawnProcess: RobotSpawner = defaultRobotSpawner) {}

  isRunning(): boolean {
    return this.child !== null;
  }

  /** Starts a run. Fails fast if one is already in progress. */
  start(options: RobotRunOptions, events: RunnerEvents = {}): void {
    if (this.child !== null) {
      throw new Error("A Robot run is already in progress");
    }
    const child = this.spawnProcess("robot", ["--outputdir", "reports", options.testPath], {
      cwd: options.cwd,
    });
    this.child = child;

    const emitLines = (chunk: Buffer | string): void => {
      for (const line of chunk.toString().split("\n")) {
        if (line.length > 0) {
          events.onLine?.(line);
        }
      }
    };
    child.stdout?.on("data", emitLines);
    child.stderr?.on("data", emitLines);
    child.on("close", (code) => {
      this.child = null;
      events.onExit?.(code ?? 0);
    });
  }

  /** Stops the current run, if any. */
  stop(): void {
    if (this.child !== null) {
      this.child.kill("SIGTERM");
      this.child = null;
    }
  }
}
