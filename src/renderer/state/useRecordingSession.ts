import { useEffect, useMemo, useState } from "react";
import type { ScriptActionDto, SelectorCandidateDto } from "../../shared/ipc-contract.js";
import { useBridge } from "./bridge.js";
import { useIpcEvent } from "./events.js";

// Recording session (PRD §10, §11): consumes the `capture:action` stream pushed
// from the Browser Sandbox and accumulates it into the active case's manual
// script, persisting incrementally as actions arrive. Each step keeps the ranked
// selector candidates so the timeline can warn about a low-confidence pick and
// offer alternatives. Capture is ignored unless the session is active and a case
// is selected. Outside Electron the event bridge is absent, so the session stays
// empty.

/** A recorded step: the action plus the selector candidates for its element. */
export interface RecordedStep {
  readonly action: ScriptActionDto;
  readonly selectors: readonly SelectorCandidateDto[];
}

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
  /** The recorded steps (action + selector candidates), in order. */
  readonly steps: readonly RecordedStep[];
  /** Discards the accumulated steps (e.g. when starting a new recording). */
  clear: () => void;
  /** Removes the step at `index` (timeline edit). */
  removeAction: (index: number) => void;
  /** Moves the step at `index` by `delta` (-1 up, +1 down), clamped. */
  moveAction: (index: number, delta: number) => void;
  /** Replaces the action at `index` (e.g. after editing a field), keeping its selectors. */
  updateAction: (index: number, action: ScriptActionDto) => void;
}

export function useRecordingSession(options: RecordingSessionOptions): RecordingSession {
  const bridge = useBridge();
  const [steps, setSteps] = useState<readonly RecordedStep[]>([]);
  const actions = useMemo(() => steps.map((step) => step.action), [steps]);

  useIpcEvent("capture:action", (payload) => {
    if (options.active && options.caseId !== null) {
      setSteps((previous) => [
        ...previous,
        { action: payload.action, selectors: payload.selectors ?? [] },
      ]);
    }
  });

  // Persist the manual script incrementally as the step list grows.
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
    steps,
    clear: () => setSteps([]),
    removeAction: (index) => setSteps((prev) => prev.filter((_, i) => i !== index)),
    moveAction: (index, delta) =>
      setSteps((prev) => {
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
      setSteps((prev) => prev.map((step, i) => (i === index ? { ...step, action } : step))),
  };
}
