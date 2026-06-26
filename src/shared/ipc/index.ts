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
