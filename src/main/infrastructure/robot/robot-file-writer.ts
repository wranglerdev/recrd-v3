import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { RobotFileWriter } from "../../../application/compile/compile-service.js";

// On-disk Robot file writer (PRD §13, §14). Writes a generated `.robot` into the
// project's Robot tree under tests/, creating the directory if needed. Concrete
// Node implementation injected at the composition root so the compile use case
// stays platform-agnostic.

/** Builds the filesystem-backed Robot file writer. */
export function createRobotFileWriter(): RobotFileWriter {
  return {
    write(robotPath, fileName, content) {
      const testsDir = join(robotPath, "tests");
      mkdirSync(testsDir, { recursive: true });
      const filePath = join(testsDir, fileName);
      writeFileSync(filePath, content, "utf8");
      return filePath;
    },
  };
}
