import { describe, expect, it, vi } from "vitest";
import { createIpcEventEmitter } from "@main/ipc/ipc-event-emitter";

describe("createIpcEventEmitter (PRD §15)", () => {
  it("drops events until a target is attached", () => {
    const emitter = createIpcEventEmitter();
    // No target yet: emitting must not throw.
    expect(() => emitter.emit("env:install:line", { line: "x" })).not.toThrow();
  });

  it("forwards typed events to the attached target", () => {
    const send = vi.fn();
    const emitter = createIpcEventEmitter();
    emitter.setTarget({ send });

    emitter.emit("env:install:line", { line: "hello" });
    emitter.emit("env:install:done", { ok: true, failedCommand: null });

    expect(send).toHaveBeenNthCalledWith(1, "env:install:line", { line: "hello" });
    expect(send).toHaveBeenNthCalledWith(2, "env:install:done", { ok: true, failedCommand: null });
  });

  it("stops forwarding once the target is detached", () => {
    const send = vi.fn();
    const emitter = createIpcEventEmitter();
    emitter.setTarget({ send });
    emitter.setTarget(null);

    emitter.emit("env:install:line", { line: "x" });
    expect(send).not.toHaveBeenCalled();
  });
});
