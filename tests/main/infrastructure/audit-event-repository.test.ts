import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDatabase, type DatabaseHandle } from "@main/infrastructure/db/connection";
import { createRepositories, type Repositories } from "@main/infrastructure/db/repositories";
import { createAuditTrail } from "@main/infrastructure/db/audit-event-repository";

describe("createAuditTrail (PRD §16, §18)", () => {
  let handle: DatabaseHandle;
  let repos: Repositories;
  let nextId: number;

  beforeEach(() => {
    handle = createDatabase(":memory:");
    repos = createRepositories(handle.db);
    nextId = 0;
  });

  afterEach(() => {
    handle.close();
  });

  function trail() {
    return createAuditTrail(repos.auditEvents, () => `a${++nextId}`);
  }

  it("persists an event, redacting secrets in the details (PRD §18)", () => {
    const audit = trail();
    audit.record({
      type: "mass.import",
      user: "ana",
      at: "2026-06-26T10:00:00.000Z",
      details: { name: "Login", senha: "hunter2", token: "abc" },
    });

    const [event] = audit.list();
    expect(event).toEqual({
      id: "a1",
      type: "mass.import",
      user: "ana",
      at: "2026-06-26T10:00:00.000Z",
      details: { name: "Login", senha: "[REDACTED]", token: "[REDACTED]" },
    });

    // The raw row stores redacted JSON text — the password never reaches SQLite.
    const row = repos.auditEvents.findById("a1");
    expect(row?.details).not.toContain("hunter2");
  });

  it("lists events newest-first and honours the limit", () => {
    const audit = trail();
    audit.record({ type: "compile", user: "ana", at: "2026-06-26T09:00:00.000Z", details: {} });
    audit.record({ type: "test.change", user: "ana", at: "2026-06-26T11:00:00.000Z", details: {} });
    audit.record({ type: "export", user: "ana", at: "2026-06-26T10:00:00.000Z", details: {} });

    expect(audit.list().map((event) => event.at)).toEqual([
      "2026-06-26T11:00:00.000Z",
      "2026-06-26T10:00:00.000Z",
      "2026-06-26T09:00:00.000Z",
    ]);

    expect(audit.list(1).map((event) => event.type)).toEqual(["test.change"]);
  });

  it("keeps a stable order for events sharing a timestamp", () => {
    const audit = trail();
    const at = "2026-06-26T10:00:00.000Z";
    audit.record({ type: "compile", user: "ana", at, details: {} });
    audit.record({ type: "export", user: "ana", at, details: {} });

    expect(audit.list()).toHaveLength(2);
  });
});
