import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDatabase, type DatabaseHandle } from "@main/infrastructure/db/connection";
import { createRepositories, type Repositories } from "@main/infrastructure/db/repositories";

const audit = {
  createdBy: "dev",
  createdAt: "2026-06-20T10:00:00.000Z",
  updatedBy: "dev",
  updatedAt: "2026-06-20T10:00:00.000Z",
};

describe("data model (PRD §6)", () => {
  let root: string;
  let handle: DatabaseHandle;
  let repos: Repositories;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "recrd-db-"));
    handle = createDatabase(join(root, "database.sqlite"));
    repos = createRepositories(handle.db);
  });

  afterEach(() => {
    handle.close();
    rmSync(root, { recursive: true, force: true });
  });

  it("creates and reads a project (CRUD)", () => {
    const created = repos.projects.create({
      id: "p1",
      name: "Banco XYZ",
      description: "",
      robotPath: null,
      ...audit,
    });
    expect(created.name).toBe("Banco XYZ");
    expect(repos.projects.findById("p1")?.name).toBe("Banco XYZ");
    expect(repos.projects.list()).toHaveLength(1);
  });

  it("updates and deletes a project", () => {
    repos.projects.create({ id: "p1", name: "A", description: "", robotPath: null, ...audit });
    const updated = repos.projects.update("p1", { name: "B" });
    expect(updated?.name).toBe("B");
    expect(repos.projects.remove("p1")).toBe(true);
    expect(repos.projects.findById("p1")).toBeUndefined();
  });

  it("returns undefined/false for missing rows", () => {
    expect(repos.projects.findById("nope")).toBeUndefined();
    expect(repos.projects.update("nope", { name: "x" })).toBeUndefined();
    expect(repos.projects.remove("nope")).toBe(false);
  });

  it("persists the project->plan->suite->case hierarchy", () => {
    repos.projects.create({ id: "p1", name: "P", description: "", robotPath: null, ...audit });
    repos.plans.create({ id: "pl1", projectId: "p1", name: "Plan", description: "", ...audit });
    repos.suites.create({ id: "s1", planId: "pl1", name: "Suite", ...audit });
    repos.cases.create({
      id: "c1",
      suiteId: "s1",
      name: "Case",
      description: "",
      status: "draft",
      ...audit,
    });
    repos.scripts.create({ id: "sc1", caseId: "c1", kind: "manual", content: "[]", ...audit });
    repos.executions.create({
      id: "e1",
      caseId: "c1",
      startedAt: "2026-06-20T10:00:00.000Z",
      result: "passed",
      durationMs: 1200,
      log: "",
      ...audit,
    });
    repos.masses.create({
      id: "m1",
      projectId: "p1",
      name: "Massa",
      columns: '["usuario"]',
      rows: '[{"usuario":"admin"}]',
      ...audit,
    });

    expect(repos.cases.findById("c1")?.suiteId).toBe("s1");
    expect(repos.executions.findById("e1")?.result).toBe("passed");
    expect(repos.masses.findById("m1")?.name).toBe("Massa");
  });

  it("enforces foreign keys (cascade delete)", () => {
    repos.projects.create({ id: "p1", name: "P", description: "", robotPath: null, ...audit });
    repos.plans.create({ id: "pl1", projectId: "p1", name: "Plan", description: "", ...audit });

    repos.projects.remove("p1");
    expect(repos.plans.findById("pl1")).toBeUndefined();
  });
});
