// Barrel for the per-feature IPC contracts (PRD §3). The generic primitives live
// in ./core; each feature file declares its DTOs, channel map, name list and API
// slice. The aggregate map and `createRecrdApi` are composed in ../ipc-contract.
export {
  defineChannelNames,
  type ChannelDef,
  type ChannelMap,
  type Invoke,
  type RequestOf,
  type ResponseOf,
} from "./core.js";
export { APP_CHANNELS, createAppApi, type AppApi, type AppChannels, type AppInfo } from "./app.js";
export {
  ROBOT_CHANNELS,
  createRobotApi,
  type RobotApi,
  type RobotChannels,
  type ScaffoldRobotRequest,
  type ScaffoldRobotResponse,
  type LinkRobotRequest,
  type LinkRobotResponse,
} from "./robot.js";
export {
  PROJECT_CHANNELS,
  createProjectApi,
  type ProjectApi,
  type ProjectChannels,
  type ProjectDto,
  type CreateProjectRequest,
  type RenameProjectRequest,
  type UpdateProjectDetailsRequest,
  type ProjectIdRequest,
} from "./project.js";
export {
  HIERARCHY_CHANNELS,
  createHierarchyApi,
  type HierarchyApi,
  type HierarchyChannels,
  type PlanChannels,
  type SuiteChannels,
  type CaseChannels,
  type PlanDto,
  type SuiteDto,
  type CaseDto,
  type CaseStatus,
  type CreatePlanRequest,
  type CreateSuiteRequest,
  type CreateCaseRequest,
  type RenameRequest,
  type UpdateDescriptionRequest,
  type SetCaseStatusRequest,
  type IdRequest,
} from "./hierarchy.js";
export {
  MASS_CHANNELS,
  createMassApi,
  type MassApi,
  type MassChannels,
  type MassDto,
  type MassRow,
  type MassImportEntryDto,
  type ImportMassRequest,
  type ImportMassResponse,
  type ListMassesRequest,
  type RenameMassRequest,
  type EditMassValueRequest,
  type CsvSelectionDto,
} from "./mass.js";
export {
  COMPILE_CHANNELS,
  createCompileApi,
  type CompileApi,
  type CompileChannels,
  type ScriptActionDto,
  type ManualScriptDto,
  type SelectorWarningDto,
  type ValidationIssueDto,
  type CompileRequest,
  type CompileResponse,
} from "./compile.js";
export { DIALOG_CHANNELS, createDialogApi, type DialogApi, type DialogChannels } from "./dialog.js";
export {
  SETTINGS_CHANNELS,
  createSettingsApi,
  type SettingsApi,
  type SettingsChannels,
  type SettingsDto,
  type SettingsPatch,
  type ToolPathsDto,
  type RecordingPreferencesDto,
  type WindowStateDto,
} from "./settings.js";
export {
  GIT_CHANNELS,
  createGitApi,
  type GitApi,
  type GitChannels,
  type GitStatusResult,
  type GitChangeDto,
  type GitFileStatusDto,
  type GitPathRequest,
} from "./git.js";
export {
  AUDIT_CHANNELS,
  createAuditApi,
  type AuditApi,
  type AuditChannels,
  type AuditEventDto,
  type AuditEventTypeDto,
  type ListAuditEventsRequest,
} from "./audit.js";
export {
  EXECUTION_CHANNELS,
  createExecutionApi,
  type ExecutionApi,
  type ExecutionChannels,
  type RecentExecutionDto,
  type ExecutionResultDto,
  type ListRecentExecutionsRequest,
  type ListExecutionsByCaseRequest,
} from "./execution.js";
export {
  ENVIRONMENT_CHANNELS,
  createEnvironmentApi,
  type EnvironmentApi,
  type EnvironmentChannels,
  type EnvironmentReportDto,
  type EnvironmentStatusDto,
  type CheckEnvironmentRequest,
  type StartInstallRequest,
  type StartInstallResult,
} from "./environment.js";
export {
  IPC_EVENT_CHANNELS,
  type IpcEvents,
  type IpcEventMap,
  type IpcEventChannel,
  type IpcEventListener,
  type StreamLineEvent,
  type InstallDoneEvent,
  type RunExitEvent,
} from "./events.js";
export {
  RUN_CHANNELS,
  createRunApi,
  type RunApi,
  type RunChannels,
  type StartRunRequest,
  type StartRunResult,
} from "./run.js";
export {
  EXPORT_CHANNELS,
  createExportApi,
  type ExportApi,
  type ExportChannels,
  type ExportCaseRequest,
  type ExportExecutionRequest,
  type ExportResult,
} from "./export.js";
