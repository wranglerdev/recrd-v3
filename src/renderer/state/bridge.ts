import { useMemo } from "react";
import type { RecrdApi } from "../../shared/ipc-contract.js";

// Typed access to the preload bridge (PRD §3, §18). `window.recrd` is the
// renderer's only channel to the main process; it is absent outside Electron
// (plain Vite preview, component tests), so every accessor degrades to null
// rather than throwing, letting the UI render a disconnected state.

/** The typed bridge, or null when running outside Electron. */
export function getBridge(): RecrdApi | null {
  if (typeof window === "undefined" || typeof window.recrd === "undefined") {
    return null;
  }
  return window.recrd;
}

/**
 * Hook returning the typed bridge (or null outside Electron). The bridge is
 * injected once at preload time, so the reference is memoised for a stable
 * identity across renders (safe in effect/callback dependency lists).
 */
export function useBridge(): RecrdApi | null {
  return useMemo(() => getBridge(), []);
}
