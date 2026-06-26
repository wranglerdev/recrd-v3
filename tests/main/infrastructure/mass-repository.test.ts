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

  it("finds, lists and updates masses, (de)serialising the JSON columns", () => {
    const massRepo = createMassRepository(repos.masses);
    const base: StoredMass = {
      id: "m1",
      projectId: "p1",
      name: "Usuários",
      columns: ["usuario", "senha"],
      rows: [{ usuario: "admin", senha: "123" }],
      history: [{ at: "2026-06-20T10:00:00.000Z", rowCount: 1, source: "/tmp/x.csv" }],
      ...audit,
    };
    massRepo.create(base);

    expect(massRepo.findById("m1")).toEqual(base);
    expect(massRepo.findById("absent")).toBeUndefined();
    expect(massRepo.list()).toEqual([base]);

    const updated = massRepo.update("m1", {
      name: "Credenciais",
      rows: [{ usuario: "admin", senha: "nova" }],
      updatedBy: "ana",
    });
    expect(updated).toMatchObject({
      name: "Credenciais",
      rows: [{ usuario: "admin", senha: "nova" }],
      updatedBy: "ana",
    });
    // Untouched JSON columns survive the partial patch.
    expect(updated?.columns).toEqual(["usuario", "senha"]);
    expect(massRepo.update("absent", { name: "x" })).toBeUndefined();

    // A full patch exercises every field branch of the row serialiser.
    const fully = massRepo.update("m1", {
      id: "m1",
      projectId: "p1",
      name: "Final",
      columns: ["a"],
      rows: [{ a: "1" }],
      history: [{ at: "2026-06-21T00:00:00.000Z", rowCount: 1, source: "y" }],
      createdBy: "dev",
      createdAt: audit.createdAt,
      updatedBy: "bob",
      updatedAt: "2026-06-21T00:00:00.000Z",
    });
    expect(fully).toMatchObject({ name: "Final", columns: ["a"], updatedBy: "bob" });

    // A patch that omits the name keeps it unchanged (name-absent branch).
    const renamedAudit = massRepo.update("m1", { updatedBy: "z" });
    expect(renamedAudit).toMatchObject({ name: "Final", updatedBy: "z" });
  });
});
