import { beforeEach, describe, expect, it } from "vitest";
import {
  createMassUseCases,
  type MassRepository,
  type MassUseCases,
  type StoredMass,
} from "../../src/application/mass/mass-service";
import type { AuditEvent, AuditSink } from "../../src/application/audit/audit-service";
import type { UserContext } from "../../src/domain/auth/user-context";

class FakeMassRepository implements MassRepository {
  readonly store: StoredMass[] = [];
  create(mass: StoredMass): StoredMass {
    this.store.push(mass);
    return mass;
  }
  findById(id: string): StoredMass | undefined {
    return this.store.find((mass) => mass.id === id);
  }
  list(): StoredMass[] {
    return [...this.store];
  }
  update(id: string, patch: Partial<StoredMass>): StoredMass | undefined {
    const index = this.store.findIndex((mass) => mass.id === id);
    if (index === -1) return undefined;
    const updated = { ...this.store[index], ...patch } as StoredMass;
    this.store[index] = updated;
    return updated;
  }
}

const USER: UserContext = { username: "jdoe", displayName: "J", domain: "CORP", sid: "S-1" };

let repository: FakeMassRepository;
let masses: MassUseCases;
let existingProjects: Set<string>;

beforeEach(() => {
  repository = new FakeMassRepository();
  existingProjects = new Set(["proj-1"]);
  masses = createMassUseCases({
    repository,
    projectExists: (id) => existingProjects.has(id),
    userContext: USER,
    newId: () => "mass-1",
    clock: () => new Date("2026-06-25T12:00:00.000Z"),
  });
});

describe("createMassUseCases — importCsv (PRD §7, §16)", () => {
  it("imports CSV into a persisted mass with audit and an import-history entry", () => {
    const result = masses.importCsv({
      projectId: "proj-1",
      name: "Usuários",
      csv: "usuario,senha\nadmin,123\nuser,456",
      source: "/tmp/usuarios.csv",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mass).toMatchObject({
        id: "mass-1",
        projectId: "proj-1",
        name: "Usuários",
        columns: ["usuario", "senha"],
        createdBy: "jdoe",
        createdAt: "2026-06-25T12:00:00.000Z",
      });
      expect(result.mass.rows).toHaveLength(2);
      expect(result.mass.history).toEqual([
        { at: "2026-06-25T12:00:00.000Z", rowCount: 2, source: "/tmp/usuarios.csv" },
      ]);
      expect(repository.store).toHaveLength(1);
    }
  });

  it("returns CSV validation errors without persisting", () => {
    const result = masses.importCsv({
      projectId: "proj-1",
      name: "Bad",
      csv: "a,a\n1,2", // duplicate column names
      source: "x",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toMatch(/duplicate/i);
    }
    expect(repository.store).toHaveLength(0);
  });

  it("throws when the parent project does not exist", () => {
    expect(() =>
      masses.importCsv({ projectId: "ghost", name: "M", csv: "a\n1", source: "x" }),
    ).toThrow(/projeto inexistente/i);
  });

  it("throws when the name is blank", () => {
    expect(() =>
      masses.importCsv({ projectId: "proj-1", name: "  ", csv: "a\n1", source: "x" }),
    ).toThrow(/nome da massa/i);
  });
});

describe("createMassUseCases — list/rename/editValue (PRD §7, §16)", () => {
  function importSample(): StoredMass {
    const result = masses.importCsv({
      projectId: "proj-1",
      name: "Usuários",
      csv: "usuario,senha\nadmin,123\nuser,456",
      source: "/tmp/u.csv",
    });
    if (!result.ok) throw new Error("setup import failed");
    return result.mass;
  }

  it("lists only masses under the given project", () => {
    importSample();
    expect(masses.listByProject("proj-1")).toHaveLength(1);
    expect(masses.listByProject("other")).toHaveLength(0);
  });

  it("renames a mass and refreshes its update-audit fields", () => {
    const created = importSample();
    const renamed = masses.rename(created.id, "Credenciais");

    expect(renamed.name).toBe("Credenciais");
    expect(renamed.updatedBy).toBe("jdoe");
    expect(repository.findById(created.id)?.name).toBe("Credenciais");
  });

  it("rejects a blank rename", () => {
    const created = importSample();
    expect(() => masses.rename(created.id, "   ")).toThrow(/nome da massa/i);
  });

  it("edits a single cell value, leaving other rows untouched", () => {
    const created = importSample();
    const edited = masses.editValue({
      id: created.id,
      rowIndex: 0,
      column: "senha",
      value: "novaSenha",
    });

    expect(edited.rows[0]).toMatchObject({ usuario: "admin", senha: "novaSenha" });
    expect(edited.rows[1]).toMatchObject({ usuario: "user", senha: "456" });
  });

  it("throws editing an unknown mass", () => {
    expect(() => masses.editValue({ id: "ghost", rowIndex: 0, column: "x", value: "y" })).toThrow(
      /massa inexistente/i,
    );
  });
});

describe("createMassUseCases — audit recording (PRD §16)", () => {
  it("records a mass.import event when an audit sink is wired", () => {
    const events: AuditEvent[] = [];
    const audit: AuditSink = { record: (event) => events.push(event) };
    const auditedMasses = createMassUseCases({
      repository: new FakeMassRepository(),
      projectExists: () => true,
      userContext: USER,
      newId: () => "mass-9",
      clock: () => new Date("2026-06-25T12:00:00.000Z"),
      audit,
    });

    auditedMasses.importCsv({
      projectId: "proj-1",
      name: "Usuários",
      csv: "usuario,senha\nadmin,123",
      source: "/tmp/u.csv",
    });

    expect(events).toEqual([
      {
        type: "mass.import",
        user: "jdoe",
        at: "2026-06-25T12:00:00.000Z",
        details: {
          massId: "mass-9",
          projectId: "proj-1",
          name: "Usuários",
          source: "/tmp/u.csv",
          rowCount: 1,
        },
      },
    ]);
  });

  it("does not record when the import fails validation", () => {
    const events: AuditEvent[] = [];
    const auditedMasses = createMassUseCases({
      repository: new FakeMassRepository(),
      projectExists: () => true,
      userContext: USER,
      newId: () => "mass-9",
      clock: () => new Date("2026-06-25T12:00:00.000Z"),
      audit: { record: (event) => events.push(event) },
    });

    auditedMasses.importCsv({ projectId: "proj-1", name: "Bad", csv: "a,a\n1,2", source: "x" });

    expect(events).toHaveLength(0);
  });
});
