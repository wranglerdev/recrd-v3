import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDatabase, type DatabaseHandle } from "@main/infrastructure/db/connection";
import { createRepositories, type Repositories } from "@main/infrastructure/db/repositories";
import { createMassRepository } from "@main/infrastructure/db/mass-repository";
import type { StoredMass } from "@application/mass/mass-service";

const audit = {
  createdBy: "dev",
  createdAt: "2026-06-20T10:00:00.000Z",
  updatedBy: "dev",
  updatedAt: "2026-06-20T10:00:00.000Z",
};

describe("createMassRepository (PRD §7)", () => {
  let handle: DatabaseHandle;
  let repos: Repositories;

  beforeEach(() => {
    handle = createDatabase(":memory:");
    repos = createRepositories(handle.db);
    repos.projects.create({ id: "p1", name: "P", description: "", robotPath: null, ...audit });
  });

  afterEach(() => {
    handle.close();
  });

  it("round-trips the JSON columns/rows/history through SQLite", () => {
    const massRepo = createMassRepository(repos.masses);
    const mass: StoredMass = {
      id: "m1",
      projectId: "p1",
      name: "Usuários",
      columns: ["usuario", "senha"],
      rows: [{ usuario: "admin", senha: "123" }],
      history: [{ at: "2026-06-20T10:00:00.000Z", rowCount: 1, source: "/tmp/x.csv" }],
      ...audit,
    };

    const created = massRepo.create(mass);
    expect(created).toEqual(mass);

    // Stored as JSON text in the underlying row.
    const row = repos.masses.findById("m1");
    expect(row?.columns).toBe('["usuario","senha"]');
    expect(row?.history).toContain('"rowCount":1');
  });
});
