import { describe, expect, it, vi } from "vitest";
import { registerAuditHandlers } from "@main/ipc/handlers/audit-handlers";
import { IpcRegistry } from "@main/ipc/typed-ipc";
import type { AuditEventRecord } from "@application/audit/audit-service";

const EVENT: AuditEventRecord = {
  id: "a1",
  type: "mass.import",
  user: "ana",
  at: "2026-06-26T10:00:00.000Z",
  details: { name: "Login" },
};

describe("registerAuditHandlers (PRD §16)", () => {
  it("lists audit events, forwarding the limit to the trail", async () => {
    const list = vi.fn().mockReturnValue([EVENT]);
    const registry = new IpcRegistry();
    registerAuditHandlers(registry, { list });

    await expect(registry.dispatch("audit:list", { limit: 10 })).resolves.toEqual([EVENT]);
    expect(list).toHaveBeenCalledWith(10);
  });

  it("passes an undefined limit through when omitted", async () => {
    const list = vi.fn().mockReturnValue([]);
    const registry = new IpcRegistry();
    registerAuditHandlers(registry, { list });

    await expect(registry.dispatch("audit:list", {})).resolves.toEqual([]);
    expect(list).toHaveBeenCalledWith(undefined);
  });
});
