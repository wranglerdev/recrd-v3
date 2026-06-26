// Aggregate source of truth for the typed IPC boundary (PRD §3). It composes the
// per-feature contracts in ./ipc/ into a single channel map and a single renderer
// API. Adding a feature is a three-line change here (extend the map, append the
// names, spread the API factory) plus a new file under ./ipc/.
//
// Lives in the shared layer because it is the contract shared by main, preload
// and renderer. It contains only plain, serialisable wire types — no
// Node/Electron imports — so the renderer can depend on it without reaching into
// the platform.

import type { Invoke } from "./ipc/core.js";
import { APP_CHANNELS, createAppApi, type AppApi, type AppChannels } from "./ipc/app.js";
import { ROBOT_CHANNELS, createRobotApi, type RobotApi, type RobotChannels } from "./ipc/robot.js";
import {
  PROJECT_CHANNELS,
  createProjectApi,
  type ProjectApi,
  type ProjectChannels,
} from "./ipc/project.js";
import {
  HIERARCHY_CHANNELS,
  createHierarchyApi,
  type HierarchyApi,
  type HierarchyChannels,
} from "./ipc/hierarchy.js";
import { MASS_CHANNELS, createMassApi, type MassApi, type MassChannels } from "./ipc/mass.js";
import {
  COMPILE_CHANNELS,
  createCompileApi,
  type CompileApi,
  type CompileChannels,
} from "./ipc/compile.js";

export type { ChannelDef, ChannelMap, Invoke, RequestOf, ResponseOf } from "./ipc/core.js";
export type { AppInfo } from "./ipc/app.js";
export type { ScaffoldRobotRequest, ScaffoldRobotResponse } from "./ipc/robot.js";
export type {
  ProjectDto,
  CreateProjectRequest,
  RenameProjectRequest,
  UpdateProjectDetailsRequest,
  ProjectIdRequest,
} from "./ipc/project.js";
export type {
  PlanDto,
  SuiteDto,
  CaseDto,
  CaseStatus,
  CreatePlanRequest,
  CreateSuiteRequest,
  CreateCaseRequest,
  RenameRequest,
  UpdateDescriptionRequest,
  SetCaseStatusRequest,
  IdRequest,
} from "./ipc/hierarchy.js";
export type {
  MassDto,
  MassRow,
  MassImportEntryDto,
  ImportMassRequest,
  ImportMassResponse,
  ListMassesRequest,
  RenameMassRequest,
  EditMassValueRequest,
  CsvSelectionDto,
} from "./ipc/mass.js";
export type {
  ScriptActionDto,
  ManualScriptDto,
  SelectorWarningDto,
  ValidationIssueDto,
  CompileRequest,
  CompileResponse,
} from "./ipc/compile.js";

/**
 * Every IPC channel, composed from the feature channel maps by intersection
 * (e.g. `AppChannels & ProjectChannels & MassChannels`). This is the only place
 * the full channel set is assembled; add a feature by `&`-ing in its map.
 */
export type IpcChannelMap = AppChannels &
  RobotChannels &
  ProjectChannels &
  HierarchyChannels &
  MassChannels &
  CompileChannels;

export type IpcChannel = keyof IpcChannelMap;
export type IpcRequest<C extends IpcChannel> = IpcChannelMap[C]["request"];
export type IpcResponse<C extends IpcChannel> = IpcChannelMap[C]["response"];

/** Function the renderer-side bridge uses to invoke a channel (ipcRenderer.invoke). */
export type IpcInvoke = Invoke<IpcChannelMap>;

/**
 * Every channel name, composed from the feature name lists. Useful for
 * binding/iteration; `satisfies` keeps it in lock-step with the channel map.
 */
export const IPC_CHANNELS = [
  ...APP_CHANNELS,
  ...ROBOT_CHANNELS,
  ...PROJECT_CHANNELS,
  ...HIERARCHY_CHANNELS,
  ...MASS_CHANNELS,
  ...COMPILE_CHANNELS,
] as const satisfies readonly IpcChannel[];

/**
 * The typed API surface exposed to the renderer on `window.recrd` via
 * contextBridge. Composed from the per-feature API slices; the renderer calls
 * these methods instead of touching Node, the filesystem or the database
 * directly (PRD §3, §18).
 */
export type RecrdApi = AppApi & RobotApi & ProjectApi & HierarchyApi & MassApi & CompileApi;

/**
 * Builds the renderer API from an `invoke` function by composing the per-feature
 * API factories. Pure and injectable, so the mapping from API methods to IPC
 * channels is unit-testable without Electron.
 */
export function createRecrdApi(invoke: IpcInvoke): RecrdApi {
  return {
    ...createAppApi(invoke),
    ...createRobotApi(invoke),
    ...createProjectApi(invoke),
    ...createHierarchyApi(invoke),
    ...createMassApi(invoke),
    ...createCompileApi(invoke),
  };
}
