import { useEffect, type RefObject } from "react";
import type { SandboxBoundsRequest } from "../../shared/ipc-contract.js";

// Reports a DOM element's pixel rectangle and keeps it in sync as the element
// resizes or the window changes (PRD §9). Used to coordinate the embedded
// BrowserView's bounds with the renderer layout: the Automation screen owns the
// sandbox region in the DOM and forwards its rect to the main process. On
// unmount it reports `null` so the caller can hide the view.

export type ViewportRect = SandboxBoundsRequest;

/** Observes `ref` and calls `onChange` with its rounded rect (or null on teardown). */
export function useResizeRect(
  ref: RefObject<HTMLElement | null>,
  onChange: (rect: ViewportRect | null) => void,
): void {
  useEffect(() => {
    const element = ref.current;
    if (element === null) {
      return;
    }
    const report = (): void => {
      const rect = element.getBoundingClientRect();
      onChange({
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    };
    report();
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => report()) : null;
    observer?.observe(element);
    window.addEventListener("resize", report);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", report);
      onChange(null);
    };
  }, [ref, onChange]);
}
