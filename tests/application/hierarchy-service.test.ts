import { beforeEach, describe, expect, it } from "vitest";
import {
  createCaseUseCases,
  createPlanUseCases,
  createSuiteUseCases,
  type CaseUseCases,
  type Plan,
  type PlanUseCases,
  type Suite,
  type SuiteUseCases,
  type TestCase,
} from "../../src/application/hierarchy/hierarchy-service";
import type { EntityRepository, Identified } from "../../src/application/crud/audited-crud";
import type { AuditEvent, AuditSink } from "../../src/application/audit/audit-service";
import type { UserContext } from "../../src/domain/auth/user-context";

// Generic in-memory repository fake for any Identified entity.
class FakeRepository<E extends Identified> implements EntityRepository<E> {
  readonly store = new Map<string, E>();
  create(entity: E): E {
    this.store.set(entity.id, entity);
    return entity;
  }
  findById(id: string): E | undefined {
    return this.store.get(id);
  }
  list(): E[] {
    return [...this.store.values()];
  }
  update(id: string, patch: Partial<E>): E | undefined {
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
  sid: "S-1",
};

let ids: string[];
let now: Date;

function nextId(): string {
  return ids.shift() ?? "id-fallback";
}

beforeEach(() => {
  ids = ["a", "b", "c", "d"];
  now = new Date("2026-06-25T12:00:00.000Z");
});

describe("createPlanUseCases (PRD §6, §16)", () => {
  let repository: FakeRepository<Plan>;
  let plans: PlanUseCases;
  let existingProjects: Set<string>;

  beforeEach(() => {
    repository = new FakeRepository<Plan>();
    existingProjects = new Set(["proj-1"]);
    plans = createPlanUseCases({
      repository,
      projectExists: (id) => existingProjects.has(id),
      userContext: USER,
      newId: nextId,
      clock: () => now,
    });
  });

  it("creates a plan under an existing project with audit fields", () => {
    const plan = plans.create({ projectId: "proj-1", name: "  Regressão  ", description: " x " });
    expect(plan).toMatchObject({
      id: "a",
      projectId: "proj-1",
      name: "Regressão",
      description: "x",
      createdBy: "jdoe",
      createdAt: "2026-06-25T12:00:00.000Z",
    });
  });

  it("refuses to create a plan under a missing project", () => {
    expect(() => plans.create({ projectId: "ghost", name: "X" })).toThrow(/projeto inexistente/i);
  });

  it("rejects a blank name", () => {
    expect(() => plans.create({ projectId: "proj-1", name: " " })).toThrow(/nome do plano/i);
  });

  it("lists plans filtered by project", () => {
    existingProjects.add("proj-2");
    plans.create({ projectId: "proj-1", name: "P1" });
    plans.create({ projectId: "proj-2", name: "P2" });
    expect(plans.listByProject("proj-1").map((p) => p.name)).toEqual(["P1"]);
  });

  it("opens, renames and updates the description with refreshed audit", () => {
    const created = plans.create({ projectId: "proj-1", name: "P1" });
    expect(plans.open(created.id)).toEqual(created);

    now = new Date("2026-06-26T00:00:00.000Z");
    const renamed = plans.rename(created.id, " P1b ");
    expect(renamed.name).toBe("P1b");
    expect(renamed.updatedAt).toBe("2026-06-26T00:00:00.000Z");
    expect(renamed.createdAt).toBe("2026-06-25T12:00:00.000Z");

    const described = plans.updateDescription(created.id, "  nova  ");
    expect(described.description).toBe("nova");
  });

  it("throws for missing open/rename and blank rename, and removes", () => {
    expect(() => plans.open("nope")).toThrow(/plano inexistente/i);
    expect(() => plans.rename("nope", "X")).toThrow(/plano inexistente/i);
    const created = plans.create({ projectId: "proj-1", name: "P1" });
    expect(() => plans.rename(created.id, " ")).toThrow(/nome do plano/i);
    plans.remove(created.id);
    expect(repository.findById(created.id)).toBeUndefined();
    expect(() => plans.remove("nope")).toThrow(/plano inexistente/i);
  });
});

describe("createSuiteUseCases (PRD §6, §16)", () => {
  let repository: FakeRepository<Suite>;
  let suites: SuiteUseCases;
  let existingPlans: Set<string>;

  beforeEach(() => {
    repository = new FakeRepository<Suite>();
    existingPlans = new Set(["plan-1"]);
    suites = createSuiteUseCases({
      repository,
      planExists: (id) => existingPlans.has(id),
      userContext: USER,
      newId: nextId,
      clock: () => now,
    });
  });

  it("creates a suite under an existing plan", () => {
    const suite = suites.create({ planId: "plan-1", name: "Smoke" });
    expect(suite).toMatchObject({ planId: "plan-1", name: "Smoke", createdBy: "jdoe" });
  });

  it("enforces parent and name validity", () => {
    expect(() => suites.create({ planId: "ghost", name: "S" })).toThrow(/plano inexistente/i);
    expect(() => suites.create({ planId: "plan-1", name: "" })).toThrow(/nome da suíte/i);
  });

  it("lists by plan, renames, opens and removes", () => {
    existingPlans.add("plan-2");
    const created = suites.create({ planId: "plan-1", name: "S1" });
    suites.create({ planId: "plan-2", name: "S2" });
    expect(suites.listByPlan("plan-1").map((s) => s.name)).toEqual(["S1"]);
    expect(suites.rename(created.id, "S1b").name).toBe("S1b");
    expect(suites.open(created.id).name).toBe("S1b");
    suites.remove(created.id);
    expect(() => suites.open(created.id)).toThrow(/suíte inexistente/i);
  });
});

describe("createCaseUseCases (PRD §6, §16)", () => {
  let repository: FakeRepository<TestCase>;
  let cases: CaseUseCases;
  let existingSuites: Set<string>;

  beforeEach(() => {
    repository = new FakeRepository<TestCase>();
    existingSuites = new Set(["suite-1"]);
    cases = createCaseUseCases({
      repository,
      suiteExists: (id) => existingSuites.has(id),
      userContext: USER,
      newId: nextId,
      clock: () => now,
    });
  });

  it("creates a case in 'draft' under an existing suite", () => {
    const testCase = cases.create({ suiteId: "suite-1", name: "Login", description: " ok " });
    expect(testCase).toMatchObject({
      suiteId: "suite-1",
      name: "Login",
      description: "ok",
      status: "draft",
      createdBy: "jdoe",
    });
  });

  it("enforces parent and name validity", () => {
    expect(() => cases.create({ suiteId: "ghost", name: "C" })).toThrow(/suíte inexistente/i);
    expect(() => cases.create({ suiteId: "suite-1", name: " " })).toThrow(/nome do caso/i);
  });

  it("lists by suite, renames, updates description and status, opens and removes", () => {
    existingSuites.add("suite-2");
    const created = cases.create({ suiteId: "suite-1", name: "C1" });
    cases.create({ suiteId: "suite-2", name: "C2" });
    expect(cases.listBySuite("suite-1").map((c) => c.name)).toEqual(["C1"]);

    expect(cases.rename(created.id, "C1b").name).toBe("C1b");
    expect(cases.updateDescription(created.id, " desc ").description).toBe("desc");

    now = new Date("2026-06-27T00:00:00.000Z");
    const ready = cases.setStatus(created.id, "ready");
    expect(ready.status).toBe("ready");
    expect(ready.updatedAt).toBe("2026-06-27T00:00:00.000Z");

    expect(cases.open(created.id).status).toBe("ready");
    cases.remove(created.id);
    expect(() => cases.remove(created.id)).toThrow(/caso inexistente/i);
  });
});

describe("createCaseUseCases — audit recording (PRD §16)", () => {
  function makeCases(audit: AuditSink): CaseUseCases {
    return createCaseUseCases({
      repository: new FakeRepository<TestCase>(),
      suiteExists: () => true,
      userContext: USER,
      newId: nextId,
      clock: () => now,
      audit,
    });
  }

  it("records a test.change event for each case mutation", () => {
    const events: AuditEvent[] = [];
    const cases = makeCases({ record: (event) => events.push(event) });

    const created = cases.create({ suiteId: "suite-1", name: "Login" });
    cases.rename(created.id, "Acesso");
    cases.updateDescription(created.id, "desc");
    cases.setStatus(created.id, "ready");

    expect(events.map((event) => [event.type, event.details.action])).toEqual([
      ["test.change", "create"],
      ["test.change", "rename"],
      ["test.change", "updateDescription"],
      ["test.change", "setStatus"],
    ]);
    expect(events[0]).toMatchObject({
      user: "jdoe",
      details: { caseId: created.id, suiteId: "suite-1", action: "create" },
    });
  });
});
