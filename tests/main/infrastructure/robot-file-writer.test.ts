import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRobotFileWriter } from "@main/infrastructure/robot/robot-file-writer";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "recrd-robotfile-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("createRobotFileWriter", () => {
  it("writes the .robot under tests/, creating the folder, and returns its path", () => {
    const writer = createRobotFileWriter();
    const content = "*** Test Cases ***\nLogin\n    No Operation\n";

    const path = writer.write(dir, "login.robot", content);

    expect(path).toBe(join(dir, "tests", "login.robot"));
    expect(readFileSync(path, "utf8")).toBe(content);
  });
});
