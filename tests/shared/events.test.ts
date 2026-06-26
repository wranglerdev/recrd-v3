import { describe, expect, it } from "vitest";
import { IPC_EVENT_CHANNELS } from "@shared/ipc";

describe("IPC_EVENT_CHANNELS", () => {
  it("lists the install streaming channels", () => {
    expect(IPC_EVENT_CHANNELS).toEqual(["env:install:line", "env:install:done"]);
  });

  it("has no duplicates", () => {
    expect(new Set(IPC_EVENT_CHANNELS).size).toBe(IPC_EVENT_CHANNELS.length);
  });
});
