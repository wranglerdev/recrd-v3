import { useEffect, useRef } from "react";
import type { IpcEventChannel, IpcEventListener, IpcEvents } from "../../shared/ipc-contract.js";

// Renderer access to the one-way event bridge (PRD §15). `window.recrdEvents` is
// injected at preload time; it is absent outside Electron (plain Vite preview,
// component tests), so the accessor degrades to null and the hook becomes a no-op.

/** The event-subscription bridge, or null when running outside Electron. */
export function getEventBridge(): IpcEvents | null {
  if (typeof window === "undefined" || typeof window.recrdEvents === "undefined") {
    return null;
  }
  return window.recrdEvents;
}

/**
 * Subscribes to a main→renderer event channel for the lifetime of the component.
 * The latest `listener` is always invoked without re-subscribing on every render,
 * and the subscription is torn down on unmount.
 */
export function useIpcEvent<C extends IpcEventChannel>(
  channel: C,
  listener: IpcEventListener<C>,
): void {
  const ref = useRef(listener);
  ref.current = listener;

  useEffect(() => {
    const bridge = getEventBridge();
    if (bridge === null) {
      return;
    }
    return bridge.subscribe(channel, (payload) => ref.current(payload));
  }, [channel]);
}
