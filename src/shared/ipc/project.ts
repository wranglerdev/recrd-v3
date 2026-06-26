import { defineChannelNames, type Invoke } from "./core.js";

// `project:*` feature contract — Project CRUD (PRD §6, §16). Follows the app
// template. Wire types mirror the application Project (audit fields are ISO
// strings), so the boundary is plain and serialisable with no domain↔DTO mapping.

/** Wire DTO for a persisted Project. */
export interface ProjectDto {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly robotPath: string | null;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedBy: string;
  readonly updatedAt: string;
}

export interface CreateProjectRequest {
  readonly name: string;
  readonly description?: string;
  readonly robotPath?: string | null;
}

export interface RenameProjectRequest {
  readonly id: string;
  readonly name: string;
}

export interface UpdateProjectDetailsRequest {
  readonly id: string;
  readonly description?: string;
  readonly robotPath?: string | null;
}

export interface ProjectIdRequest {
  readonly id: string;
}

export type ProjectChannels = {
  "project:create": { request: CreateProjectRequest; response: ProjectDto };
  "project:list": { request: void; response: readonly ProjectDto[] };
  "project:open": { request: ProjectIdRequest; response: ProjectDto };
  "project:rename": { request: RenameProjectRequest; response: ProjectDto };
  "project:updateDetails": { request: UpdateProjectDetailsRequest; response: ProjectDto };
  "project:remove": { request: ProjectIdRequest; response: void };
};

export const PROJECT_CHANNELS = defineChannelNames<
  ProjectChannels,
  [
    "project:create",
    "project:list",
    "project:open",
    "project:rename",
    "project:updateDetails",
    "project:remove",
  ]
>([
  "project:create",
  "project:list",
  "project:open",
  "project:rename",
  "project:updateDetails",
  "project:remove",
]);

/** The slice of the renderer API served by the project feature. */
export interface ProjectApi {
  createProject(request: CreateProjectRequest): Promise<ProjectDto>;
  listProjects(): Promise<readonly ProjectDto[]>;
  openProject(request: ProjectIdRequest): Promise<ProjectDto>;
  renameProject(request: RenameProjectRequest): Promise<ProjectDto>;
  updateProjectDetails(request: UpdateProjectDetailsRequest): Promise<ProjectDto>;
  removeProject(request: ProjectIdRequest): Promise<void>;
}

export function createProjectApi(invoke: Invoke<ProjectChannels>): ProjectApi {
  return {
    createProject: (request) => invoke("project:create", request),
    listProjects: () => invoke("project:list", undefined),
    openProject: (request) => invoke("project:open", request),
    renameProject: (request) => invoke("project:rename", request),
    updateProjectDetails: (request) => invoke("project:updateDetails", request),
    removeProject: (request) => invoke("project:remove", request),
  };
}
