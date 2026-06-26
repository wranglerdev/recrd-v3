import { beforeEach, describe, expect, it } from "vitest";
import {
  createProjectUseCases,
  type Project,
  type ProjectRepository,
  type ProjectUseCases,
} from "../../src/application/project/project-service";
import type { UserContext } from "../../src/domain/auth/user-context";

// In-memory ProjectRepository fake — mirrors the CrudRepository contract closely
// enough to exercise the use cases without SQLite.
class FakeProjectRepository implements ProjectRepository {
  readonly store = new Map<string, Project>();

  create(project: Project): Project {
    this.store.set(project.id, project);
    return project;
  }
  findById(id: string): Project | undefined {
    return this.store.get(id);
  }
  list(): Project[] {
    return [...this.store.values()];
  }
  update(id: string, patch: Partial<Project>): Project | undefined {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return undefined;
    }
    const updated = { ...existing, ...patch };
    this.store.set(id, updated);
    return updated;
  }
  remove(id: string): boolean {
    return this.store.delete(id);
  }
}

const USER: UserContext = {
  username: "jdoe",
  displayName: "John Doe",
  domain: "CORP",
  sid: "S-1-5-21",
};

let repository: FakeProjectRepository;
let ids: string[];
let now: Date;
let useCases: ProjectUseCases;

beforeEach(() => {
  repository = new FakeProjectRepository();
  ids = ["id-1", "id-2", "id-3"];
  now = new Date("2026-06-25T12:00:00.000Z");
  useCases = createProjectUseCases({
    repository,
    userContext: USER,
    newId: () => ids.shift() ?? "id-fallback",
    clock: () => now,
  });
});

describe("createProjectUseCases — create (PRD §6, §16)", () => {
  it("creates a project with audit fields stamped from the user and clock", () => {
    const project = useCases.create({ name: "Banco XYZ" });

    expect(project).toMatchObject({
      id: "id-1",
      name: "Banco XYZ",
      description: "",
      robotPath: null,
      createdBy: "jdoe",
      createdAt: "2026-06-25T12:00:00.000Z",
      updatedBy: "jdoe",
      updatedAt: "2026-06-25T12:00:00.000Z",
    });
    expect(repository.findById("id-1")).toEqual(project);
  });

  it("trims the name/description and keeps a provided robot path", () => {
    const project = useCases.create({
      name: "  Loja  ",
      description: "  vendas  ",
      robotPath: "/repo/loja",
    });

    expect(project.name).toBe("Loja");
    expect(project.description).toBe("vendas");
    expect(project.robotPath).toBe("/repo/loja");
  });

  it("rejects a blank name", () => {
    expect(() => useCases.create({ name: "   " })).toThrow(/nome do projeto/i);
  });
});

describe("createProjectUseCases — read (PRD §6)", () => {
  it("lists every project", () => {
    useCases.create({ name: "A" });
    useCases.create({ name: "B" });

    expect(useCases.list().map((p) => p.name)).toEqual(["A", "B"]);
  });

  it("opens an existing project", () => {
    const created = useCases.create({ name: "A" });
    expect(useCases.open(created.id)).toEqual(created);
  });

  it("throws when opening a missing project", () => {
    expect(() => useCases.open("nope")).toThrow(/não encontrado/i);
  });
});

describe("createProjectUseCases — update (PRD §6, §16)", () => {
  it("renames and refreshes only the update-audit fields", () => {
    const created = useCases.create({ name: "Old" });
    now = new Date("2026-06-26T08:30:00.000Z");

    const renamed = useCases.rename(created.id, "  New  ");

    expect(renamed.name).toBe("New");
    expect(renamed.createdAt).toBe("2026-06-25T12:00:00.000Z"); // unchanged
    expect(renamed.updatedAt).toBe("2026-06-26T08:30:00.000Z"); // refreshed
  });

  it("rejects renaming to a blank name", () => {
    const created = useCases.create({ name: "Old" });
    expect(() => useCases.rename(created.id, "  ")).toThrow(/nome do projeto/i);
  });

  it("updates the description only", () => {
    const created = useCases.create({ name: "A", robotPath: "/r" });
    const updated = useCases.updateDetails(created.id, { description: "  nova  " });

    expect(updated.description).toBe("nova");
    expect(updated.robotPath).toBe("/r"); // untouched
  });

  it("updates the robot path only, including clearing it to null", () => {
    const created = useCases.create({ name: "A", robotPath: "/r" });
    const cleared = useCases.updateDetails(created.id, { robotPath: null });

    expect(cleared.robotPath).toBeNull();
    expect(cleared.description).toBe(""); // untouched
  });

  it("throws when updating a missing project", () => {
    expect(() => useCases.rename("nope", "X")).toThrow(/não encontrado/i);
    expect(() => useCases.updateDetails("nope", { description: "x" })).toThrow(/não encontrado/i);
  });
});

describe("createProjectUseCases — delete (PRD §6)", () => {
  it("removes an existing project", () => {
    const created = useCases.create({ name: "A" });
    useCases.remove(created.id);
    expect(repository.findById(created.id)).toBeUndefined();
  });

  it("throws when deleting a missing project", () => {
    expect(() => useCases.remove("nope")).toThrow(/não encontrado/i);
  });
});
