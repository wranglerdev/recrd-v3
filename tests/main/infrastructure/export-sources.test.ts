import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDatabase, type DatabaseHandle } from "@main/infrastructure/db/connection";
import { createRepositories, type Repositories } from "@main/infrastructure/db/repositories";
import {
  createExecutionLogSource,
  createManualScriptSource,
} from "@main/infrastructure/db/export-sources";
import type { ManualScript } from "@domain/scripts/script-action";

const audit = {
  createdBy: "dev",
  createdAt: "2026-06-20T10:00:00.000Z",
  updatedBy: "dev",
  updatedAt: "2026-06-20T10:00:00.000Z",
};

const script: ManualScript = {
  name: "Login",
  actions: [{ type: "navigate", url: "https://example.com" }],
};

describe("export sources (PRD §17)", () => {
  let handle: DatabaseHandle;
  let repos: Repositories;

  beforeEach(() => {
    handle = createDatabase(":memory:");
    repos = createRepositories(handle.db);
    // Scripts/executions carry a case_id foreign key, so seed the hierarchy.
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

  describe("createManualScriptSource", () => {
    it("parses the manual script stored for a case", () => {
      repos.scripts.create({
        id: "s1",
        caseId: "c1",
        kind: "manual",
        content: JSON.stringify(script),
        ...audit,
      });
      const source = createManualScriptSource(repos);
      expect(source("c1")).toEqual(script);
    });

    it("ignores compiled scripts and returns the newest manual one", () => {
      repos.scripts.create({
        id: "compiled",
        caseId: "c1",
        kind: "compiled",
        content: "*** robot ***",
        ...audit,
      });
      repos.scripts.create({
        id: "old",
        caseId: "c1",
        kind: "manual",
        content: JSON.stringify({ name: "Old", actions: [] }),
        ...audit,
        updatedAt: "2026-06-20T09:00:00.000Z",
      });
      repos.scripts.create({
        id: "new",
        caseId: "c1",
        kind: "manual",
        content: JSON.stringify(script),
        ...audit,
        updatedAt: "2026-06-20T11:00:00.000Z",
      });
      const source = createManualScriptSource(repos);
      expect(source("c1")).toEqual(script);
    });

    it("returns the newest manual script regardless of insertion order", () => {
      // Insert newest-first so the sort comparator exercises the reverse ordering.
      repos.scripts.create({
        id: "new",
        caseId: "c1",
        kind: "manual",
        content: JSON.stringify(script),
        ...audit,
        updatedAt: "2026-06-20T11:00:00.000Z",
      });
      repos.scripts.create({
        id: "old",
        caseId: "c1",
        kind: "manual",
        content: JSON.stringify({ name: "Old", actions: [] }),
        ...audit,
        updatedAt: "2026-06-20T09:00:00.000Z",
      });
      const source = createManualScriptSource(repos);
      expect(source("c1")).toEqual(script);
    });

    it("is stable when two manual scripts share an updatedAt", () => {
      repos.scripts.create({
        id: "a",
        caseId: "c1",
        kind: "manual",
        content: JSON.stringify(script),
        ...audit,
      });
      repos.scripts.create({
        id: "b",
        caseId: "c1",
        kind: "manual",
        content: JSON.stringify(script),
        ...audit,
      });
      const source = createManualScriptSource(repos);
      expect(source("c1")).toEqual(script);
    });

    it("returns undefined when the case has no manual script", () => {
      const source = createManualScriptSource(repos);
      expect(source("absent")).toBeUndefined();
    });
  });

  describe("createExecutionLogSource", () => {
    it("returns a recorded execution's log and start time", () => {
      repos.executions.create({
        id: "e1",
        caseId: "c1",
        startedAt: "2026-06-20T00:00:00.000Z",
        result: "passed",
        durationMs: 100,
        log: "10:35 ok",
        ...audit,
      });
      const source = createExecutionLogSource(repos);
      expect(source("e1")).toEqual({
        log: "10:35 ok",
        startedAt: new Date("2026-06-20T00:00:00.000Z"),
      });
    });

    it("returns undefined when the execution is absent", () => {
      const source = createExecutionLogSource(repos);
      expect(source("absent")).toBeUndefined();
    });
  });
});
