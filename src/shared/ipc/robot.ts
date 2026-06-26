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

export type RobotChannels = {
  "robot:scaffold": { request: ScaffoldRobotRequest; response: ScaffoldRobotResponse };
};

export const ROBOT_CHANNELS = defineChannelNames<RobotChannels, ["robot:scaffold"]>([
  "robot:scaffold",
]);

export interface RobotApi {
  /** Scaffolds the standard Robot project tree and links it to the project. */
  scaffoldRobotProject(request: ScaffoldRobotRequest): Promise<ScaffoldRobotResponse>;
}

export function createRobotApi(invoke: Invoke<RobotChannels>): RobotApi {
  return {
    scaffoldRobotProject: (request) => invoke("robot:scaffold", request),
  };
}
