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
