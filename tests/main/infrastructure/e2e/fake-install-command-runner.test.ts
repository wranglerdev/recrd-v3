import { describe, expect, it } from "vitest";
import { createFakeInstallCommandRunner } from "@main/infrastructure/e2e/fake-install-command-runner";

describe("createFakeInstallCommandRunner", () => {
  it("echoes a line per command and resolves the configured exit code", async () => {
    const runner = createFakeInstallCommandRunner({ exitCode: 0 });
    const lines: string[] = [];

    const exit = await runner("python -m venv .venv", "/repo", (line) => lines.push(line));

    expect(exit).toBe(0);
    expect(lines).toEqual(["[e2e] executando: python -m venv .venv"]);
  });

  it("returns a non-zero exit code to simulate a failed install", async () => {
    const runner = createFakeInstallCommandRunner({ exitCode: 2 });
    const exit = await runner("pip install robotframework", "/repo", () => undefined);
    expect(exit).toBe(2);
  });
});
