import { spawn } from "node:child_process";
import type { StreamingCommandRunner } from "../../../application/environment/install-service.js";

// Spawn-based streaming command runner (PRD §14). Splits a command line, runs it
// in the given cwd via the OS shell, forwards stdout/stderr line-by-line, and
// resolves with the exit code. Shell-enabled so the plan's pip/venv commands
// resolve against PATH on Windows. Integration code — exercised via the E2E
// suite, not unit tests.
export const spawnInstallCommandRunner: StreamingCommandRunner = (commandLine, cwd, onLine) =>
  new Promise((resolve) => {
    const child = spawn(commandLine, { cwd, shell: true });

    const emit = (chunk: Buffer | string): void => {
      for (const line of chunk.toString().split("\n")) {
        if (line.length > 0) {
          onLine(line);
        }
      }
    };
    child.stdout?.on("data", emit);
    child.stderr?.on("data", emit);
    child.on("close", (code) => resolve(code ?? 0));
    child.on("error", (error) => {
      onLine(error.message);
      resolve(1);
    });
  });
