import { defineChannelNames, type Invoke } from "./core.js";

// `git:*` feature contract — read-only Git integration (PRD §14): current branch
// and changed files for a project's Robot repository, plus opening the repo in an
// external tool. Wire types mirror the infrastructure GitStatus.

export type GitFileStatusDto =
  | "modified"
  | "added"
  | "deleted"
  | "renamed"
  | "untracked"
  | "unknown";

export interface GitChangeDto {
  readonly path: string;
  readonly status: GitFileStatusDto;
}

export interface GitStatusResult {
  /** False when the path is not a git work tree; branch/changes are then empty. */
  readonly isRepository: boolean;
  readonly branch: string;
  readonly changes: readonly GitChangeDto[];
}

export interface GitPathRequest {
  readonly cwd: string;
}

export type GitChannels = {
  "git:status": { request: GitPathRequest; response: GitStatusResult };
  "git:openExternal": { request: GitPathRequest; response: void };
};

export const GIT_CHANNELS = defineChannelNames<GitChannels, ["git:status", "git:openExternal"]>([
  "git:status",
  "git:openExternal",
]);

/** The slice of the renderer API served by the git feature. */
export interface GitApi {
  getGitStatus(request: GitPathRequest): Promise<GitStatusResult>;
  /** Opens the repository folder in the OS for an external diff/inspection. */
  openGitExternal(request: GitPathRequest): Promise<void>;
}

export function createGitApi(invoke: Invoke<GitChannels>): GitApi {
  return {
    getGitStatus: (request) => invoke("git:status", request),
    openGitExternal: (request) => invoke("git:openExternal", request),
  };
}
