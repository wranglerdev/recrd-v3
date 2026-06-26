import { defineChannelNames, type Invoke } from "./core.js";

// `robot:*` feature contract — Robot project scaffolding (PRD §14). Wire types
// are plain and serialisable (paths as strings), so no domain↔DTO mapping is
// needed at this boundary.

export interface ScaffoldRobotRequest {
  readonly projectId: string;
  readonly root: string;
}

export interface ScaffoldRobotResponse {
  readonly created: readonly string[];
  readonly robotPath: string;
}

export interface LinkRobotRequest {
  readonly projectId: string;
  readonly root: string;
}

/** Linking fails (ok:false) when the folder is missing required Robot paths. */
export type LinkRobotResponse =
  | { readonly ok: true; readonly robotPath: string }
  | { readonly ok: false; readonly missing: readonly string[] };

export type RobotChannels = {
  "robot:scaffold": { request: ScaffoldRobotRequest; response: ScaffoldRobotResponse };
  "robot:linkExisting": { request: LinkRobotRequest; response: LinkRobotResponse };
};

export const ROBOT_CHANNELS = defineChannelNames<
  RobotChannels,
  ["robot:scaffold", "robot:linkExisting"]
>(["robot:scaffold", "robot:linkExisting"]);

export interface RobotApi {
  /** Scaffolds the standard Robot project tree and links it to the project. */
  scaffoldRobotProject(request: ScaffoldRobotRequest): Promise<ScaffoldRobotResponse>;
  /** Validates an existing Robot repo folder and links it to the project. */
  linkRobotProject(request: LinkRobotRequest): Promise<LinkRobotResponse>;
}

export function createRobotApi(invoke: Invoke<RobotChannels>): RobotApi {
  return {
    scaffoldRobotProject: (request) => invoke("robot:scaffold", request),
    linkRobotProject: (request) => invoke("robot:linkExisting", request),
  };
}
