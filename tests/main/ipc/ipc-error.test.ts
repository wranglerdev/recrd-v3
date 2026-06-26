import { describe, expect, it } from "vitest";
import {
  GENERIC_IPC_MESSAGE,
  IpcHandlerError,
  friendlyMessage,
  toIpcHandlerError,
} from "@main/ipc/ipc-error";

describe("friendlyMessage", () => {
  it("passes through a non-empty Error message", () => {
    expect(friendlyMessage(new Error("Projeto não encontrado"))).toBe("Projeto não encontrado");
  });

  it("falls back to the generic message for blank or non-Error throws", () => {
    expect(friendlyMessage(new Error("   "))).toBe(GENERIC_IPC_MESSAGE);
    expect(friendlyMessage("boom")).toBe(GENERIC_IPC_MESSAGE);
    expect(friendlyMessage(undefined)).toBe(GENERIC_IPC_MESSAGE);
  });
});

describe("toIpcHandlerError", () => {
  it("wraps a thrown value into a serialisable IpcHandlerError carrying the channel", () => {
    const error = toIpcHandlerError("project:open", new Error("Projeto não encontrado: p1"));

    expect(error).toBeInstanceOf(IpcHandlerError);
    expect(error.name).toBe("IpcHandlerError");
    expect(error.channel).toBe("project:open");
    expect(error.message).toBe("Projeto não encontrado: p1");
  });
});
