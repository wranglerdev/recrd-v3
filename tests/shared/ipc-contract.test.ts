import { describe, expect, it, vi } from "vitest";
import { IPC_CHANNELS, createRecrdApi, type AppInfo, type IpcInvoke } from "@shared/ipc-contract";
import { APP_CHANNELS, createAppApi } from "@shared/ipc";

describe("createRecrdApi", () => {
  it("maps getAppInfo to the app:getInfo channel", async () => {
    const info: AppInfo = { name: "recrd", version: "0.1.0", platform: "linux" };
    const invoke = vi.fn<IpcInvoke>().mockResolvedValue(info);
    const api = createRecrdApi(invoke as IpcInvoke);

    await expect(api.getAppInfo()).resolves.toEqual(info);
    expect(invoke).toHaveBeenCalledWith("app:getInfo", undefined);
  });

  it("is composed from the per-feature API factories", () => {
    const invoke = vi.fn<IpcInvoke>();
    const composed = createRecrdApi(invoke as IpcInvoke);
    const appSlice = createAppApi(invoke as IpcInvoke);
    // Every app-feature method is present on the aggregate API.
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
