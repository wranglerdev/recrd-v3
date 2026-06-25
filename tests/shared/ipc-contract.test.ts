import { describe, expect, it, vi } from "vitest";
import { IPC_CHANNELS, createRecrdApi, type AppInfo, type IpcInvoke } from "@shared/ipc-contract";

describe("createRecrdApi", () => {
  it("maps getAppInfo to the app:getInfo channel", async () => {
    const info: AppInfo = { name: "recrd", version: "0.1.0", platform: "linux" };
    const invoke = vi.fn<IpcInvoke>().mockResolvedValue(info);
    const api = createRecrdApi(invoke as IpcInvoke);

    await expect(api.getAppInfo()).resolves.toEqual(info);
    expect(invoke).toHaveBeenCalledWith("app:getInfo", undefined);
  });
});

describe("IPC_CHANNELS", () => {
  it("lists the app:getInfo channel", () => {
    expect(IPC_CHANNELS).toContain("app:getInfo");
  });
});
