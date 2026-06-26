import { describe, expect, it, vi } from "vitest";
import {
  createInstallUseCases,
  type InstallProgress,
  type StreamingCommandRunner,
} from "../../src/application/environment/install-service";

function recordingProgress(): InstallProgress & {
  lines: string[];
  doneCalls: Array<{ ok: boolean; failedCommand: string | null }>;
} {
  const lines: string[] = [];
  const doneCalls: Array<{ ok: boolean; failedCommand: string | null }> = [];
  return {
    lines,
    doneCalls,
    line: (line) => lines.push(line),
    done: (ok, failedCommand) => doneCalls.push({ ok, failedCommand }),
  };
}

describe("createInstallUseCases (PRD §14)", () => {
  it("runs the plan in order, streaming output, then reports success", async () => {
    const progress = recordingProgress();
    const runner: StreamingCommandRunner = vi.fn(async (commandLine, _cwd, onLine) => {
      onLine(`running ${commandLine}`);
      return 0;
    });
    const useCases = createInstallUseCases({ runner, progress });

    await useCases.run(["a", "b"], "/repo");

    expect(progress.lines).toEqual(["$ a", "running a", "$ b", "running b"]);
    expect(progress.doneCalls).toEqual([{ ok: true, failedCommand: null }]);
    expect(runner).toHaveBeenCalledTimes(2);
    expect(useCases.isRunning()).toBe(false);
  });

  it("stops at the first failing command and reports it", async () => {
    const progress = recordingProgress();
    const runner: StreamingCommandRunner = vi.fn(async (commandLine) =>
      commandLine === "b" ? 1 : 0,
    );
    const useCases = createInstallUseCases({ runner, progress });

    await useCases.run(["a", "b", "c"], "/repo");

    expect(runner).toHaveBeenCalledTimes(2); // c is never reached
    expect(progress.doneCalls).toEqual([{ ok: false, failedCommand: "b" }]);
  });

  it("reports success immediately for an empty plan", async () => {
    const progress = recordingProgress();
    const useCases = createInstallUseCases({ runner: vi.fn(), progress });

    await useCases.run([], "/repo");

    expect(progress.doneCalls).toEqual([{ ok: true, failedCommand: null }]);
  });

  it("ignores a concurrent run while one is in progress", async () => {
    const progress = recordingProgress();
    let resolveFirst: (code: number) => void = () => undefined;
    const runner: StreamingCommandRunner = vi.fn(
      () => new Promise<number>((resolve) => (resolveFirst = resolve)),
    );
    const useCases = createInstallUseCases({ runner, progress });

    const first = useCases.run(["a"], "/repo");
    expect(useCases.isRunning()).toBe(true);

    // A second run while the first is pending is a no-op.
    await useCases.run(["b"], "/repo");
    expect(runner).toHaveBeenCalledTimes(1);

    resolveFirst(0);
    await first;
    expect(useCases.isRunning()).toBe(false);
    expect(progress.doneCalls).toEqual([{ ok: true, failedCommand: null }]);
  });
});
