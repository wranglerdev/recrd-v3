// @vitest-environment jsdom
import type { JSX } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useRecordingSession } from "@renderer/state/useRecordingSession";
import type { IpcEvents, RecrdApi, ScriptActionDto } from "@shared/ipc-contract";

afterEach(() => {
  Reflect.deleteProperty(window, "recrd");
  Reflect.deleteProperty(window, "recrdEvents");
});

function stubBridge(api: Partial<RecrdApi>): void {
  Object.defineProperty(window, "recrd", { value: api, configurable: true });
}

function stubEvents(): (action: ScriptActionDto) => void {
  const listeners = new Map<string, (payload: unknown) => void>();
  const events: IpcEvents = {
    subscribe(channel, listener) {
      listeners.set(channel, listener as (payload: unknown) => void);
      return () => listeners.delete(channel);
    },
  };
  Object.defineProperty(window, "recrdEvents", { value: events, configurable: true });
  return (action) => act(() => listeners.get("capture:action")?.({ action }));
}

function Harness(props: { caseId: string | null; active: boolean }): JSX.Element {
  const session = useRecordingSession({
    caseId: props.caseId,
    caseName: "Login",
    active: props.active,
  });
  return <span data-testid="count">{session.actions.length}</span>;
}

const CLICK: ScriptActionDto = { type: "click", selector: "#go" };

describe("useRecordingSession (PRD §10)", () => {
  it("accumulates captured actions and persists incrementally", async () => {
    const saveManualScript = vi.fn().mockResolvedValue(undefined);
    stubBridge({ saveManualScript });
    const emit = stubEvents();
    render(<Harness caseId="c1" active />);

    emit(CLICK);
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    await waitFor(() =>
      expect(saveManualScript).toHaveBeenCalledWith({
        caseId: "c1",
        script: { name: "Login", actions: [CLICK] },
      }),
    );

    emit({ type: "navigate", url: "https://e.com" });
    expect(screen.getByTestId("count")).toHaveTextContent("2");
  });

  it("ignores capture while inactive", () => {
    stubBridge({ saveManualScript: vi.fn() });
    const emit = stubEvents();
    render(<Harness caseId="c1" active={false} />);

    emit(CLICK);
    expect(screen.getByTestId("count")).toHaveTextContent("0");
    expect(window.recrd?.saveManualScript).not.toHaveBeenCalled();
  });

  it("ignores capture when no case is selected", () => {
    stubBridge({ saveManualScript: vi.fn() });
    const emit = stubEvents();
    render(<Harness caseId={null} active />);

    emit(CLICK);
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });
});

describe("useRecordingSession timeline edits (PRD §13)", () => {
  let session: import("@renderer/state").RecordingSession;

  function EditHarness(): JSX.Element {
    session = useRecordingSession({ caseId: "c1", caseName: "Login", active: true });
    return <span data-testid="actions">{session.actions.map((a) => a.type).join(",")}</span>;
  }

  it("removes, reorders and updates actions, persisting each change", async () => {
    const saveManualScript = vi.fn().mockResolvedValue(undefined);
    stubBridge({ saveManualScript });
    const emit = stubEvents();
    render(<EditHarness />);

    emit({ type: "navigate", url: "https://e.com" });
    emit({ type: "input", selector: "#u", value: "ana" });
    emit(CLICK);
    expect(screen.getByTestId("actions")).toHaveTextContent("navigate,input,click");

    act(() => session.moveAction(2, -1));
    expect(screen.getByTestId("actions")).toHaveTextContent("navigate,click,input");

    act(() => session.removeAction(0));
    expect(screen.getByTestId("actions")).toHaveTextContent("click,input");

    act(() => session.updateAction(1, { type: "input", selector: "#u", value: "bob" }));
    await waitFor(() =>
      expect(saveManualScript).toHaveBeenLastCalledWith({
        caseId: "c1",
        script: {
          name: "Login",
          actions: [
            { type: "click", selector: "#go" },
            { type: "input", selector: "#u", value: "bob" },
          ],
        },
      }),
    );
  });

  it("ignores out-of-range moves", () => {
    stubBridge({ saveManualScript: vi.fn() });
    const emit = stubEvents();
    render(<EditHarness />);

    emit(CLICK);
    act(() => session.moveAction(0, -1)); // already at the top
    act(() => session.moveAction(0, 1)); // only one element
    expect(screen.getByTestId("actions")).toHaveTextContent("click");
  });
});
