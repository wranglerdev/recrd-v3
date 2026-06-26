import type {
  CaseUseCases,
  PlanUseCases,
  SuiteUseCases,
} from "../../../application/hierarchy/hierarchy-service.js";
import type { IpcRegistry } from "../typed-ipc.js";

// Registers the `plan:*` / `suite:*` / `case:*` IPC handlers (PRD §6). Thin
// transport adapters over the hierarchy use cases, resolved from the container
// at the composition root.
export interface HierarchyUseCases {
  readonly plans: PlanUseCases;
  readonly suites: SuiteUseCases;
  readonly cases: CaseUseCases;
}

export function registerHierarchyHandlers(
  registry: IpcRegistry,
  useCases: HierarchyUseCases,
): void {
  const { plans, suites, cases } = useCases;

  registry.handle("plan:create", (request) => plans.create(request));
  registry.handle("plan:listByProject", (request) => plans.listByProject(request.id));
  registry.handle("plan:open", (request) => plans.open(request.id));
  registry.handle("plan:rename", (request) => plans.rename(request.id, request.name));
  registry.handle("plan:updateDescription", (request) =>
    plans.updateDescription(request.id, request.description),
  );
  registry.handle("plan:remove", (request) => plans.remove(request.id));

  registry.handle("suite:create", (request) => suites.create(request));
  registry.handle("suite:listByPlan", (request) => suites.listByPlan(request.id));
  registry.handle("suite:open", (request) => suites.open(request.id));
  registry.handle("suite:rename", (request) => suites.rename(request.id, request.name));
  registry.handle("suite:remove", (request) => suites.remove(request.id));

  registry.handle("case:create", (request) => cases.create(request));
  registry.handle("case:listBySuite", (request) => cases.listBySuite(request.id));
  registry.handle("case:open", (request) => cases.open(request.id));
  registry.handle("case:rename", (request) => cases.rename(request.id, request.name));
  registry.handle("case:updateDescription", (request) =>
    cases.updateDescription(request.id, request.description),
  );
  registry.handle("case:setStatus", (request) => cases.setStatus(request.id, request.status));
  registry.handle("case:remove", (request) => cases.remove(request.id));
}
