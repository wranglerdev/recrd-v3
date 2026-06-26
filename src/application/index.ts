// Application layer — use cases orchestrating the domain (platform-agnostic).
// Depends on `domain`; never imports Electron/Node or outer layers.
export {
  exportCompiledRobot,
  exportExecutionLog,
  exportManualScriptJson,
  type ExportEnvironment,
} from "./export/export-service.js";
export {
  recordAuditEvent,
  type AuditEvent,
  type AuditEventType,
  type AuditSink,
} from "./audit/audit-service.js";
export {
  createProjectUseCases,
  type Clock,
  type CreateProjectInput,
  type IdGenerator,
  type Project,
  type ProjectRepository,
  type ProjectUseCaseDeps,
  type ProjectUseCases,
  type UpdateProjectDetailsInput,
} from "./project/project-service.js";
export {
  openOrThrow,
  auditedUpdate,
  removeOrThrow,
  requireParentExists,
  requireText,
  type AuditContext,
  type EntityRepository,
  type Identified,
  type ParentCheck,
} from "./crud/audited-crud.js";
export {
  compileScript,
  type CompileResult,
  type CompileSuccess,
  type CompileFailure,
  type SelectorWarning,
} from "./compile/compile-pipeline.js";
export {
  createPlanUseCases,
  createSuiteUseCases,
  createCaseUseCases,
  type CaseStatus,
  type CaseUseCaseDeps,
  type CaseUseCases,
  type CreateCaseInput,
  type CreatePlanInput,
  type CreateSuiteInput,
  type Plan,
  type PlanUseCaseDeps,
  type PlanUseCases,
  type Suite,
  type SuiteUseCaseDeps,
  type SuiteUseCases,
  type TestCase,
} from "./hierarchy/hierarchy-service.js";
