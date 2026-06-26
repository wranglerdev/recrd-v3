// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getEventBridge, useIpcEvent } from "@renderer/state";
import type { IpcEvents } from "@shared/ipc-contract";

afterEach(() => {
  Reflect.deleteProperty(window, "recrdEvents");
});

function stubEvents(api: IpcEvents): void {
  Object.defineProperty(window, "recrdEvents", { value: api, configurable: true });
}

function Probe({ onLine }: { onLine: (line: string) => void }) {
  useIpcEvent("env:install:line", (payload) => onLine(payload.line));
  return null;
}

describe("getEventBridge", () => {
  it("returns null when the event bridge is absent", () => {
    expect(getEventBridge()).toBeNull();
  });
});

describe("useIpcEvent (PRD §15)", () => {
  it("subscribes on mount and forwards payloads to the latest listener", () => {
    const captured: { emit: ((payload: { line: string }) => void) | null } = { emit: null };
    const unsubscribe = vi.fn();
    stubEvents({
      subscribe: vi.fn((_channel, listener) => {
        captured.emit = listener as (payload: { line: string }) => void;
        return unsubscribe;
      }),
    });

    const onLine = vi.fn();
    const { unmount } = render(<Probe onLine={onLine} />);

    expect(captured.emit).not.toBeNull();
    captured.emit?.({ line: "hello" });
    expect(onLine).toHaveBeenCalledWith("hello");

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("is a no-op when the event bridge is absent", () => {
    // No window.recrdEvents stubbed: rendering must not throw.
    expect(() => render(<Probe onLine={vi.fn()} />)).not.toThrow();
  });
});
