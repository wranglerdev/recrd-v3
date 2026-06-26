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
