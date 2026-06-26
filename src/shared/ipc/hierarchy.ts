import { defineChannelNames, type Invoke } from "./core.js";

// `plan:*` / `suite:*` / `case:*` feature contract — the test hierarchy below a
// Project (PRD §6, §16). Follows the app template; wire types mirror the
// application entities (audit fields are ISO strings), so the boundary stays
// plain and serialisable with no domain↔DTO mapping.

interface AuditDto {
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedBy: string;
  readonly updatedAt: string;
}

// ---- Plan -------------------------------------------------------------------

export interface PlanDto extends AuditDto {
  readonly id: string;
  readonly projectId: string;
  readonly name: string;
  readonly description: string;
}

export interface CreatePlanRequest {
  readonly projectId: string;
  readonly name: string;
  readonly description?: string;
}

export interface RenameRequest {
  readonly id: string;
  readonly name: string;
}

export interface UpdateDescriptionRequest {
  readonly id: string;
  readonly description: string;
}

export interface IdRequest {
  readonly id: string;
}

export type PlanChannels = {
  "plan:create": { request: CreatePlanRequest; response: PlanDto };
  "plan:listByProject": { request: IdRequest; response: readonly PlanDto[] };
  "plan:open": { request: IdRequest; response: PlanDto };
  "plan:rename": { request: RenameRequest; response: PlanDto };
  "plan:updateDescription": { request: UpdateDescriptionRequest; response: PlanDto };
  "plan:remove": { request: IdRequest; response: void };
};

// ---- Suite ------------------------------------------------------------------

export interface SuiteDto extends AuditDto {
  readonly id: string;
  readonly planId: string;
  readonly name: string;
}

export interface CreateSuiteRequest {
  readonly planId: string;
  readonly name: string;
}

export type SuiteChannels = {
  "suite:create": { request: CreateSuiteRequest; response: SuiteDto };
  "suite:listByPlan": { request: IdRequest; response: readonly SuiteDto[] };
  "suite:open": { request: IdRequest; response: SuiteDto };
  "suite:rename": { request: RenameRequest; response: SuiteDto };
  "suite:remove": { request: IdRequest; response: void };
};

// ---- Case -------------------------------------------------------------------

export type CaseStatus = "draft" | "ready" | "deprecated";

export interface CaseDto extends AuditDto {
  readonly id: string;
  readonly suiteId: string;
  readonly name: string;
  readonly description: string;
  readonly status: CaseStatus;
}

export interface CreateCaseRequest {
  readonly suiteId: string;
  readonly name: string;
  readonly description?: string;
}

export interface SetCaseStatusRequest {
  readonly id: string;
  readonly status: CaseStatus;
}

export type CaseChannels = {
  "case:create": { request: CreateCaseRequest; response: CaseDto };
  "case:listBySuite": { request: IdRequest; response: readonly CaseDto[] };
  "case:open": { request: IdRequest; response: CaseDto };
  "case:rename": { request: RenameRequest; response: CaseDto };
  "case:updateDescription": { request: UpdateDescriptionRequest; response: CaseDto };
  "case:setStatus": { request: SetCaseStatusRequest; response: CaseDto };
  "case:remove": { request: IdRequest; response: void };
};

// ---- Composed hierarchy contract --------------------------------------------

export type HierarchyChannels = PlanChannels & SuiteChannels & CaseChannels;

export const HIERARCHY_CHANNELS = defineChannelNames<
  HierarchyChannels,
  [
    "plan:create",
    "plan:listByProject",
    "plan:open",
    "plan:rename",
    "plan:updateDescription",
    "plan:remove",
    "suite:create",
    "suite:listByPlan",
    "suite:open",
    "suite:rename",
    "suite:remove",
    "case:create",
    "case:listBySuite",
    "case:open",
    "case:rename",
    "case:updateDescription",
    "case:setStatus",
    "case:remove",
  ]
>([
  "plan:create",
  "plan:listByProject",
  "plan:open",
  "plan:rename",
  "plan:updateDescription",
  "plan:remove",
  "suite:create",
  "suite:listByPlan",
  "suite:open",
  "suite:rename",
  "suite:remove",
  "case:create",
  "case:listBySuite",
  "case:open",
  "case:rename",
  "case:updateDescription",
  "case:setStatus",
  "case:remove",
]);

/** The slice of the renderer API served by the hierarchy feature. */
export interface HierarchyApi {
  createPlan(request: CreatePlanRequest): Promise<PlanDto>;
  listPlansByProject(request: IdRequest): Promise<readonly PlanDto[]>;
  openPlan(request: IdRequest): Promise<PlanDto>;
  renamePlan(request: RenameRequest): Promise<PlanDto>;
  updatePlanDescription(request: UpdateDescriptionRequest): Promise<PlanDto>;
  removePlan(request: IdRequest): Promise<void>;

  createSuite(request: CreateSuiteRequest): Promise<SuiteDto>;
  listSuitesByPlan(request: IdRequest): Promise<readonly SuiteDto[]>;
  openSuite(request: IdRequest): Promise<SuiteDto>;
  renameSuite(request: RenameRequest): Promise<SuiteDto>;
  removeSuite(request: IdRequest): Promise<void>;

  createCase(request: CreateCaseRequest): Promise<CaseDto>;
  listCasesBySuite(request: IdRequest): Promise<readonly CaseDto[]>;
  openCase(request: IdRequest): Promise<CaseDto>;
  renameCase(request: RenameRequest): Promise<CaseDto>;
  updateCaseDescription(request: UpdateDescriptionRequest): Promise<CaseDto>;
  setCaseStatus(request: SetCaseStatusRequest): Promise<CaseDto>;
  removeCase(request: IdRequest): Promise<void>;
}

export function createHierarchyApi(invoke: Invoke<HierarchyChannels>): HierarchyApi {
  return {
    createPlan: (request) => invoke("plan:create", request),
    listPlansByProject: (request) => invoke("plan:listByProject", request),
    openPlan: (request) => invoke("plan:open", request),
    renamePlan: (request) => invoke("plan:rename", request),
    updatePlanDescription: (request) => invoke("plan:updateDescription", request),
    removePlan: (request) => invoke("plan:remove", request),

    createSuite: (request) => invoke("suite:create", request),
    listSuitesByPlan: (request) => invoke("suite:listByPlan", request),
    openSuite: (request) => invoke("suite:open", request),
    renameSuite: (request) => invoke("suite:rename", request),
    removeSuite: (request) => invoke("suite:remove", request),

    createCase: (request) => invoke("case:create", request),
    listCasesBySuite: (request) => invoke("case:listBySuite", request),
    openCase: (request) => invoke("case:open", request),
    renameCase: (request) => invoke("case:rename", request),
    updateCaseDescription: (request) => invoke("case:updateDescription", request),
    setCaseStatus: (request) => invoke("case:setStatus", request),
    removeCase: (request) => invoke("case:remove", request),
  };
}
