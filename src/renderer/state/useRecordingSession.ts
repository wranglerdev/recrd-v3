import { useEffect, useState } from "react";
import type { ScriptActionDto } from "../../shared/ipc-contract.js";
import { useBridge } from "./bridge.js";
import { useIpcEvent } from "./events.js";

// Recording session (PRD §10): consumes the `capture:action` stream pushed from
// the Browser Sandbox and accumulates it into the active case's manual script,
// persisting incrementally as actions arrive. Capture is ignored unless the
// session is active and a case is selected. Outside Electron the event bridge is
// absent, so the session simply stays empty.

export interface RecordingSessionOptions {
  /** The case the recording is attributed to; capture is ignored when null. */
  readonly caseId: string | null;
  /** Display name stored on the manual script (used for exports/compile). */
  readonly caseName: string;
  /** Whether capture is currently being recorded. */
  readonly active: boolean;
}

export interface RecordingSession {
  readonly actions: readonly ScriptActionDto[];
  /** Discards the accumulated actions (e.g. when starting a new recording). */
  clear: () => void;
  /** Removes the action at `index` (timeline edit). */
  removeAction: (index: number) => void;
  /** Moves the action at `index` by `delta` (-1 up, +1 down), clamped. */
  moveAction: (index: number, delta: number) => void;
  /** Replaces the action at `index` (e.g. after editing a field). */
  updateAction: (index: number, action: ScriptActionDto) => void;
}

export function useRecordingSession(options: RecordingSessionOptions): RecordingSession {
  const bridge = useBridge();
  const [actions, setActions] = useState<readonly ScriptActionDto[]>([]);

  useIpcEvent("capture:action", (payload) => {
    if (options.active && options.caseId !== null) {
      setActions((previous) => [...previous, payload.action]);
    }
  });

  // Persist the manual script incrementally as the action list grows.
  useEffect(() => {
    if (bridge === null || options.caseId === null || actions.length === 0) {
      return;
    }
    void bridge.saveManualScript({
      caseId: options.caseId,
      script: { name: options.caseName, actions },
    });
  }, [bridge, options.caseId, options.caseName, actions]);

  return {
    actions,
    clear: () => setActions([]),
    removeAction: (index) => setActions((prev) => prev.filter((_, i) => i !== index)),
    moveAction: (index, delta) =>
      setActions((prev) => {
        const target = index + delta;
        if (index < 0 || index >= prev.length || target < 0 || target >= prev.length) {
          return prev;
        }
        const next = [...prev];
        const [moved] = next.splice(index, 1);
        if (moved === undefined) {
          return prev;
        }
        next.splice(target, 0, moved);
        return next;
      }),
    updateAction: (index, action) =>
      setActions((prev) => prev.map((current, i) => (i === index ? action : current))),
  };
}
