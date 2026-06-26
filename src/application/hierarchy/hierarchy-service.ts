import { createAuditFields, type AuditFields } from "../../domain/audit/audit-fields.js";
import { recordAuditEvent, type AuditSink } from "../audit/audit-service.js";
import {
  auditedUpdate,
  openOrThrow,
  removeOrThrow,
  requireParentExists,
  requireText,
  type AuditContext,
  type EntityRepository,
  type ParentCheck,
} from "../crud/audited-crud.js";

// CRUD use cases for the test hierarchy below a Project: Plan > Suite > Case
// (PRD §6, §16). Each child is created only under an existing parent
// (hierarchical integrity); auditing is stamped from the injected user context
// and clock, and the layer stays free of Node/Electron. Deletion cascades to
// children are enforced by the database schema (ON DELETE CASCADE), so the use
// cases only guard parent existence on create.

// ---- Plan -------------------------------------------------------------------

export interface Plan extends AuditFields {
  readonly id: string;
  readonly projectId: string;
  readonly name: string;
  readonly description: string;
}

export interface CreatePlanInput {
  readonly projectId: string;
  readonly name: string;
  readonly description?: string;
}

export interface PlanUseCases {
  create(input: CreatePlanInput): Plan;
  listByProject(projectId: string): Plan[];
  open(id: string): Plan;
  rename(id: string, name: string): Plan;
  updateDescription(id: string, description: string): Plan;
  remove(id: string): void;
}

export interface PlanUseCaseDeps extends AuditContext {
  readonly repository: EntityRepository<Plan>;
  /** Existence check for the parent Project (hierarchy integrity). */
  readonly projectExists: ParentCheck;
}

export function createPlanUseCases(deps: PlanUseCaseDeps): PlanUseCases {
  const { repository, projectExists, userContext, newId, clock } = deps;
  return {
    create(input) {
      requireParentExists(projectExists, input.projectId, "Projeto");
      return repository.create({
        id: newId(),
        projectId: input.projectId,
        name: requireText(input.name, "O nome do plano"),
        description: input.description?.trim() ?? "",
        ...createAuditFields(userContext.username, clock()),
      });
    },
    listByProject: (projectId) => repository.list().filter((plan) => plan.projectId === projectId),
    open: (id) => openOrThrow(repository, id, "Plano"),
    rename: (id, name) =>
      auditedUpdate(repository, deps, id, { name: requireText(name, "O nome do plano") }, "Plano"),
    updateDescription: (id, description) =>
      auditedUpdate(repository, deps, id, { description: description.trim() }, "Plano"),
    remove: (id) => removeOrThrow(repository, id, "Plano"),
  };
}

// ---- Suite ------------------------------------------------------------------

export interface Suite extends AuditFields {
  readonly id: string;
  readonly planId: string;
  readonly name: string;
}

export interface CreateSuiteInput {
  readonly planId: string;
  readonly name: string;
}

export interface SuiteUseCases {
  create(input: CreateSuiteInput): Suite;
  listByPlan(planId: string): Suite[];
  open(id: string): Suite;
  rename(id: string, name: string): Suite;
  remove(id: string): void;
}

export interface SuiteUseCaseDeps extends AuditContext {
  readonly repository: EntityRepository<Suite>;
  /** Existence check for the parent Plan (hierarchy integrity). */
  readonly planExists: ParentCheck;
}

export function createSuiteUseCases(deps: SuiteUseCaseDeps): SuiteUseCases {
  const { repository, planExists, userContext, newId, clock } = deps;
  return {
    create(input) {
      requireParentExists(planExists, input.planId, "Plano");
      return repository.create({
        id: newId(),
        planId: input.planId,
        name: requireText(input.name, "O nome da suíte"),
        ...createAuditFields(userContext.username, clock()),
      });
    },
    listByPlan: (planId) => repository.list().filter((suite) => suite.planId === planId),
    open: (id) => openOrThrow(repository, id, "Suíte"),
    rename: (id, name) =>
      auditedUpdate(repository, deps, id, { name: requireText(name, "O nome da suíte") }, "Suíte"),
    remove: (id) => removeOrThrow(repository, id, "Suíte"),
  };
}

// ---- Case -------------------------------------------------------------------

/** Authoring lifecycle of a test case (schema default: "draft"). */
export type CaseStatus = "draft" | "ready" | "deprecated";

export interface TestCase extends AuditFields {
  readonly id: string;
  readonly suiteId: string;
  readonly name: string;
  readonly description: string;
  readonly status: CaseStatus;
}

export interface CreateCaseInput {
  readonly suiteId: string;
  readonly name: string;
  readonly description?: string;
}

export interface CaseUseCases {
  create(input: CreateCaseInput): TestCase;
  listBySuite(suiteId: string): TestCase[];
  open(id: string): TestCase;
  rename(id: string, name: string): TestCase;
  updateDescription(id: string, description: string): TestCase;
  setStatus(id: string, status: CaseStatus): TestCase;
  remove(id: string): void;
}

export interface CaseUseCaseDeps extends AuditContext {
  readonly repository: EntityRepository<TestCase>;
  /** Existence check for the parent Suite (hierarchy integrity). */
  readonly suiteExists: ParentCheck;
  /** Optional audit trail; case mutations record a `test.change` event. */
  readonly audit?: AuditSink;
}

export function createCaseUseCases(deps: CaseUseCaseDeps): CaseUseCases {
  const { repository, suiteExists, userContext, newId, clock, audit } = deps;

  // Records a `test.change` audit event for a case mutation, when a trail is
  // wired (PRD §16). Returns the case unchanged so it can wrap a result inline.
  const recordChange = (testCase: TestCase, action: string): TestCase => {
    if (audit) {
      recordAuditEvent(audit, {
        type: "test.change",
        user: userContext.username,
        now: clock(),
        details: { caseId: testCase.id, suiteId: testCase.suiteId, action },
      });
    }
    return testCase;
  };

  return {
    create(input) {
      requireParentExists(suiteExists, input.suiteId, "Suíte");
      const created = repository.create({
        id: newId(),
        suiteId: input.suiteId,
        name: requireText(input.name, "O nome do caso"),
        description: input.description?.trim() ?? "",
        status: "draft",
        ...createAuditFields(userContext.username, clock()),
      });
      return recordChange(created, "create");
    },
    listBySuite: (suiteId) => repository.list().filter((testCase) => testCase.suiteId === suiteId),
    open: (id) => openOrThrow(repository, id, "Caso"),
    rename: (id, name) =>
      recordChange(
        auditedUpdate(repository, deps, id, { name: requireText(name, "O nome do caso") }, "Caso"),
        "rename",
      ),
    updateDescription: (id, description) =>
      recordChange(
        auditedUpdate(repository, deps, id, { description: description.trim() }, "Caso"),
        "updateDescription",
      ),
    setStatus: (id, status) =>
      recordChange(auditedUpdate(repository, deps, id, { status }, "Caso"), "setStatus"),
    remove: (id) => removeOrThrow(repository, id, "Caso"),
  };
}
