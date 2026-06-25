import { describe, expect, it } from "vitest";
import { SANDBOX_WEB_PREFERENCES } from "@main/sandbox/sandbox-config";

describe("SANDBOX_WEB_PREFERENCES (PRD §10, §18)", () => {
  it("isolates the sandbox: no Node, context isolation, sandbox and web security on", () => {
    expect(SANDBOX_WEB_PREFERENCES).toEqual({
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    });
  });
});
