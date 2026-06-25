import { describe, expect, it, vi } from "vitest";
import {
  RobotRunner,
  defaultRobotSpawner,
  type ChildLike,
  type RobotSpawner,
} from "@main/infrastructure/robot/robot-runner";

type DataListener = (chunk: Buffer | string) => void;
type CloseListener = (code: number | null) => void;

function fakeChild() {
  let dataListener: DataListener | undefined;
  let closeListener: CloseListener | undefined;
  const kill = vi.fn(() => true);
  const child: ChildLike = {
    stdout: { on: (_e, cb) => (dataListener = cb) },
    stderr: { on: (_e, cb) => (dataListener = cb) },
    on: (_e, cb) => (closeListener = cb),
    kill,
  };
  return {
    child,
    kill,
    emitData: (chunk: string) => dataListener?.(chunk),
    emitClose: (code: number | null) => closeListener?.(code),
  };
}

describe("RobotRunner (PRD §15)", () => {
  it("spawns robot with the test path and streams stdout lines", () => {
    const fake = fakeChild();
    const spawn: RobotSpawner = vi.fn(() => fake.child);
    const lines: string[] = [];
    const runner = new RobotRunner(spawn);

    runner.start({ cwd: "/proj", testPath: "tests/login.robot" }, { onLine: (l) => lines.push(l) });

    expect(spawn).toHaveBeenCalledWith("robot", ["--outputdir", "reports", "tests/login.robot"], {
      cwd: "/proj",
    });
    expect(runner.isRunning()).toBe(true);

    fake.emitData("10:35 Click\n10:36 Input\n");
    expect(lines).toEqual(["10:35 Click", "10:36 Input"]);
  });

  it("reports exit and resets running state on close", () => {
    const fake = fakeChild();
    const runner = new RobotRunner(() => fake.child);
    const exits: number[] = [];
    runner.start({ cwd: "/p", testPath: "t.robot" }, { onExit: (c) => exits.push(c) });

    fake.emitClose(null); // null code -> 0
    expect(exits).toEqual([0]);
    expect(runner.isRunning()).toBe(false);
  });

  it("fails fast when a run is already in progress", () => {
    const runner = new RobotRunner(() => fakeChild().child);
    runner.start({ cwd: "/p", testPath: "t.robot" });
    expect(() => runner.start({ cwd: "/p", testPath: "t.robot" })).toThrowError(
      /already in progress/i,
    );
  });

  it("stops a running process and is a no-op otherwise", () => {
    const fake = fakeChild();
    const runner = new RobotRunner(() => fake.child);
    runner.stop(); // no-op, nothing running
    runner.start({ cwd: "/p", testPath: "t.robot" });
    runner.stop();
    expect(fake.kill).toHaveBeenCalledWith("SIGTERM");
    expect(runner.isRunning()).toBe(false);
  });
});

describe("defaultRobotSpawner", () => {
  it("spawns a real child process", async () => {
    const child = defaultRobotSpawner("node", ["--version"], { cwd: process.cwd() });
    const code = await new Promise<number | null>((resolve) => {
      child.on("close", resolve);
    });
    expect(code).toBe(0);
  });
});
