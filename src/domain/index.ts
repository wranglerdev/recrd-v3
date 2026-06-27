// Domain layer — pure business rules, platform-agnostic (no Electron/Node).
export type { UserContext } from "./auth/user-context.js";
export { createAuditFields, touchAuditFields, type AuditFields } from "./audit/audit-fields.js";
export {
  ROBOT_PROJECT_DIRS,
  missingRobotPaths,
  requiredRobotPaths,
  robotProjectFiles,
  type RobotFile,
} from "./robot/robot-project-template.js";
export type { ElementDescriptor } from "./selectors/element-descriptor.js";
export {
  bestSelector,
  generateSelectors,
  unstableSelectorWarning,
  type GeneratedSelector,
  type SelectorConfidence,
  type SelectorStrategy,
} from "./selectors/selector-generator.js";
export { isAbsoluteXpath, isStableCss } from "./selectors/selector-stability.js";
export {
  captureClick,
  captureInput,
  captureNavigate,
  inspectElement,
  massVariableValue,
  massVariableReference,
  type ElementInspection,
} from "./capture/capture.js";
export type { ActionType, ManualScript, ScriptAction } from "./scripts/script-action.js";
export {
  validateScript,
  type ValidationIssue,
  type ValidationResult,
} from "./scripts/validate-script.js";
export { generateRobot } from "./compiler/robot-generator.js";
export { optimizeScript } from "./compiler/optimize-script.js";
export { validateRobotSyntax, type RobotValidation } from "./compiler/validate-robot.js";
export {
  parseMassCsv,
  toVariableMap,
  type MassParseResult,
  type MassRecord,
  type ParsedMass,
} from "./mass/mass-csv.js";
export {
  appendImport,
  editMassValue,
  massFromCsv,
  renameMass,
  type Mass,
  type MassImport,
} from "./mass/mass.js";
export {
  buildExecution,
  formatLogLine,
  resultFromExitCode,
  type Execution,
  type ExecutionResult,
} from "./execution/execution.js";
export {
  executionLogFileName,
  recrdJsonFileName,
  robotFileName,
  serializeManualScript,
  slugifyExportName,
} from "./export/export-format.js";
