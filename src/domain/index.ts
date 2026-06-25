// Domain layer — pure business rules, platform-agnostic (no Electron/Node).
export type { UserContext } from "./auth/user-context.js";
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
  executionLogFileName,
  recrdJsonFileName,
  robotFileName,
  serializeManualScript,
  slugifyExportName,
} from "./export/export-format.js";
