import { describe, expect, it, vi } from "vitest";
import { registerExecutionHandlers } from "@main/ipc/handlers/execution-handlers";
import { IpcRegistry } from "@main/ipc/typed-ipc";
import type { RecentExecution } from "@application/execution/execution-service";

const RECENT: RecentExecution = {
  id: "e1",
  caseId: "c1",
  caseName: "Login",
  result: "passed",
  startedAt: "2026-06-26T10:00:00.000Z",
  durationMs: 1200,
};

describe("registerExecutionHandlers (PRD §8, §15)", () => {
  it("lists recent executions, forwarding the limit", async () => {
    const listRecent = vi.fn().mockReturnValue([RECENT]);
    const registry = new IpcRegistry();
    registerExecutionHandlers(registry, { listRecent, record: vi.fn() });

    await expect(registry.dispatch("execution:listRecent", { limit: 5 })).resolves.toEqual([
      RECENT,
    ]);
    expect(listRecent).toHaveBeenCalledWith(5);
  });

  it("passes an undefined limit through when omitted", async () => {
    const listRecent = vi.fn().mockReturnValue([]);
    const registry = new IpcRegistry();
    registerExecutionHandlers(registry, { listRecent, record: vi.fn() });

    await expect(registry.dispatch("execution:listRecent", {})).resolves.toEqual([]);
    expect(listRecent).toHaveBeenCalledWith(undefined);
  });
});
