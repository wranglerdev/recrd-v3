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
