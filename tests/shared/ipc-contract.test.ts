import { describe, expect, it, vi } from "vitest";
import { IPC_CHANNELS, createRecrdApi, type IpcInvoke } from "@shared/ipc-contract";
import { APP_CHANNELS, createAppApi } from "@shared/ipc";

// Each renderer API method is a thin pass-through to a single channel. This table
// pins every method to its channel and the request it forwards, so the boundary
// can't silently drift (a renamed channel or a mis-wired method fails here).
const SAMPLE = { id: "x" };
const CASES: ReadonlyArray<readonly [method: string, channel: string, arg: unknown]> = [
  ["getAppInfo", "app:getInfo", undefined],
  ["getVersionInfo", "app:getVersionInfo", undefined],
  ["scaffoldRobotProject", "robot:scaffold", { projectId: "p", root: "/r" }],
  ["linkRobotProject", "robot:linkExisting", { projectId: "p", root: "/r" }],
  ["createProject", "project:create", { name: "P" }],
  ["listProjects", "project:list", undefined],
  ["openProject", "project:open", SAMPLE],
  ["renameProject", "project:rename", { id: "p", name: "N" }],
  ["updateProjectDetails", "project:updateDetails", { id: "p" }],
  ["removeProject", "project:remove", SAMPLE],
  ["createPlan", "plan:create", { projectId: "p", name: "N" }],
  ["listPlansByProject", "plan:listByProject", SAMPLE],
  ["openPlan", "plan:open", SAMPLE],
  ["renamePlan", "plan:rename", { id: "p", name: "N" }],
  ["updatePlanDescription", "plan:updateDescription", { id: "p", description: "d" }],
  ["removePlan", "plan:remove", SAMPLE],
  ["createSuite", "suite:create", { planId: "p", name: "N" }],
  ["listSuitesByPlan", "suite:listByPlan", SAMPLE],
  ["openSuite", "suite:open", SAMPLE],
  ["renameSuite", "suite:rename", { id: "s", name: "N" }],
  ["removeSuite", "suite:remove", SAMPLE],
  ["createCase", "case:create", { suiteId: "s", name: "N" }],
  ["listCasesBySuite", "case:listBySuite", SAMPLE],
  ["openCase", "case:open", SAMPLE],
  ["renameCase", "case:rename", { id: "c", name: "N" }],
  ["updateCaseDescription", "case:updateDescription", { id: "c", description: "d" }],
  ["setCaseStatus", "case:setStatus", { id: "c", status: "ready" }],
  ["removeCase", "case:remove", SAMPLE],
  ["importMass", "mass:import", { projectId: "p", name: "M", csv: "a", source: "s" }],
  ["listMassesByProject", "mass:listByProject", { projectId: "p" }],
  ["renameMass", "mass:rename", { id: "m", name: "N" }],
  ["editMassValue", "mass:editValue", { id: "m", rowIndex: 0, column: "a", value: "b" }],
  ["selectCsvFile", "mass:selectCsv", undefined],
  [
    "compileScript",
    "compile:run",
    { caseId: "c", projectId: "p", script: { name: "n", actions: [] } },
  ],
  ["selectDirectory", "dialog:selectDirectory", undefined],
  ["getSettings", "settings:getAll", undefined],
  [
    "updateSettings",
    "settings:update",
    { recording: { captureScreenshots: false, defaultTimeoutMs: 1 } },
  ],
  ["getGitStatus", "git:status", { cwd: "/repo" }],
  ["openGitExternal", "git:openExternal", { cwd: "/repo" }],
  ["listAuditEvents", "audit:list", { limit: 50 }],
  ["listRecentExecutions", "execution:listRecent", { limit: 10 }],
  ["listExecutionsByCase", "execution:listByCase", { caseId: "c", limit: 20 }],
  ["checkEnvironment", "env:check", { root: "/repo" }],
  ["startEnvironmentInstall", "env:install", { root: "/repo" }],
  ["startRun", "run:start", { projectId: "p1" }],
  ["stopRun", "run:stop", undefined],
  ["exportJson", "export:json", { caseId: "c" }],
  ["exportRobot", "export:robot", { caseId: "c" }],
  ["exportLog", "export:log", { executionId: "e" }],
];

describe("createRecrdApi", () => {
  it("maps every API method to its channel, forwarding the request", async () => {
    const invoke = vi.fn<IpcInvoke>().mockResolvedValue(undefined);
    const api = createRecrdApi(invoke as IpcInvoke) as unknown as Record<
      string,
      (arg?: unknown) => Promise<unknown>
    >;

    for (const [method, channel, arg] of CASES) {
      invoke.mockClear();
      const fn = api[method] as (a?: unknown) => Promise<unknown>;
      await (arg === undefined ? fn() : fn(arg));
      expect(invoke, `${method} -> ${channel}`).toHaveBeenCalledWith(channel, arg);
    }
  });

  it("exposes exactly one method per channel", () => {
    const api = createRecrdApi(vi.fn<IpcInvoke>() as IpcInvoke);
    expect(Object.keys(api)).toHaveLength(IPC_CHANNELS.length);
    expect(new Set(CASES.map(([, channel]) => channel))).toEqual(new Set(IPC_CHANNELS));
  });

  it("is composed from the per-feature API factories", () => {
    const invoke = vi.fn<IpcInvoke>() as IpcInvoke;
    const composed = createRecrdApi(invoke);
    const appSlice = createAppApi(invoke);
    expect(Object.keys(composed)).toEqual(expect.arrayContaining(Object.keys(appSlice)));
  });
});

describe("IPC_CHANNELS", () => {
  it("lists the app:getInfo channel", () => {
    expect(IPC_CHANNELS).toContain("app:getInfo");
  });

  it("is composed from the per-feature channel-name lists", () => {
    for (const channel of APP_CHANNELS) {
      expect(IPC_CHANNELS).toContain(channel);
    }
  });
});
