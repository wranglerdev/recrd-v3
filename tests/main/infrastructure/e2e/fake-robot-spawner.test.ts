import { describe, expect, it } from "vitest";
import { createFakeRobotSpawner } from "@main/infrastructure/e2e/fake-robot-spawner";
import { RobotRunner } from "@main/infrastructure/robot/robot-runner";

describe("createFakeRobotSpawner", () => {
  it("drives a RobotRunner with scripted lines then the chosen exit code", async () => {
    const spawner = createFakeRobotSpawner({ lines: ["one", "two"], exitCode: 0 });
    const runner = new RobotRunner(spawner);

    const lines: string[] = [];
    const exit = await new Promise<number>((resolve) => {
      runner.start(
        { cwd: "/repo", testPath: "tests" },
        { onLine: (line) => lines.push(line), onExit: resolve },
      );
    });

    expect(lines).toEqual(["one", "two"]);
    expect(exit).toBe(0);
    expect(runner.isRunning()).toBe(false);
  });

  it("reports a non-zero exit code for a failing run", async () => {
    const runner = new RobotRunner(createFakeRobotSpawner({ lines: [], exitCode: 1 }));

    const exit = await new Promise<number>((resolve) => {
      runner.start({ cwd: "/repo", testPath: "tests" }, { onExit: resolve });
    });

    expect(exit).toBe(1);
  });

  it("exposes a kill on the fake child so stop() is a no-op-safe", () => {
    const runner = new RobotRunner(createFakeRobotSpawner({ lines: ["x"], exitCode: 0 }));
    runner.start({ cwd: "/repo", testPath: "tests" }, {});
    expect(() => runner.stop()).not.toThrow();
    expect(runner.isRunning()).toBe(false);
  });
});
