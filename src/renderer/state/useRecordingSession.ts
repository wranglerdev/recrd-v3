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

  return { actions, clear: () => setActions([]) };
}
