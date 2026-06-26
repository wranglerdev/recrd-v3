import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDatabase, type DatabaseHandle } from "@main/infrastructure/db/connection";
import { createRepositories, type Repositories } from "@main/infrastructure/db/repositories";
import { createManualScriptStore } from "@main/infrastructure/db/manual-script-repository";
import type { ManualScriptRecord } from "@application/scripts/script-service";

const audit = {
  createdBy: "dev",
  createdAt: "2026-06-20T10:00:00.000Z",
  updatedBy: "dev",
  updatedAt: "2026-06-20T10:00:00.000Z",
};

function record(overrides: Partial<ManualScriptRecord>): ManualScriptRecord {
  return {
    id: "s1",
    caseId: "c1",
    kind: "manual",
    content: "{}",
    ...audit,
    ...overrides,
  };
}

describe("createManualScriptStore (PRD §6, §10)", () => {
  let handle: DatabaseHandle;
  let repos: Repositories;

  beforeEach(() => {
    handle = createDatabase(":memory:");
    repos = createRepositories(handle.db);
    repos.projects.create({ id: "p1", name: "P", description: "", robotPath: null, ...audit });
    repos.plans.create({ id: "pl1", projectId: "p1", name: "Plan", description: "", ...audit });
    repos.suites.create({ id: "su1", planId: "pl1", name: "Suite", ...audit });
    repos.cases.create({
      id: "c1",
      suiteId: "su1",
      name: "Case",
      description: "",
      status: "draft",
      ...audit,
    });
  });

  afterEach(() => {
    handle.close();
  });

  it("creates, finds and updates a case's manual script", () => {
    const store = createManualScriptStore(repos.scripts);
    const created = store.create(record({ content: '{"name":"L","actions":[]}' }));
    expect(created.id).toBe("s1");

    expect(store.findByCase("c1")?.content).toBe('{"name":"L","actions":[]}');

    const updated = store.update("s1", { content: "{}", updatedAt: "2026-06-21T00:00:00.000Z" });
    expect(updated?.content).toBe("{}");
    expect(store.update("absent", { content: "x" })).toBeUndefined();
  });

  it("ignores compiled scripts and prefers the newest manual one (ascending insert)", () => {
    const store = createManualScriptStore(repos.scripts);
    repos.scripts.create({
      id: "compiled",
      caseId: "c1",
      kind: "compiled",
      content: "*** robot ***",
      ...audit,
    });
    store.create(record({ id: "old", content: "old", updatedAt: "2026-06-20T09:00:00.000Z" }));
    store.create(record({ id: "new", content: "new", updatedAt: "2026-06-20T11:00:00.000Z" }));
    expect(store.findByCase("c1")?.id).toBe("new");
  });

  it("prefers the newest manual script (descending insert)", () => {
    const store = createManualScriptStore(repos.scripts);
    store.create(record({ id: "new", content: "new", updatedAt: "2026-06-20T11:00:00.000Z" }));
    store.create(record({ id: "old", content: "old", updatedAt: "2026-06-20T09:00:00.000Z" }));
    expect(store.findByCase("c1")?.id).toBe("new");
  });

  it("is stable when two manual scripts share an updatedAt", () => {
    const store = createManualScriptStore(repos.scripts);
    store.create(record({ id: "a", content: "a" }));
    store.create(record({ id: "b", content: "b" }));
    expect(store.findByCase("c1")).toBeDefined();
  });

  it("returns undefined when the case has no manual script", () => {
    const store = createManualScriptStore(repos.scripts);
    expect(store.findByCase("absent")).toBeUndefined();
  });
});
