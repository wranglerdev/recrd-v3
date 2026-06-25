import { useCallback, useRef, useState, type JSX, type ReactNode } from "react";
import { cx } from "./cx.js";
import "./ui.css";

export type ToastTone = "info" | "success" | "error";

export type ToastData = {
  readonly id: string;
  readonly message: ReactNode;
  readonly tone?: ToastTone;
};

export type ToastProps = {
  readonly message: ReactNode;
  readonly tone?: ToastTone | undefined;
  readonly onDismiss?: () => void;
  readonly className?: string;
};

// A single notification. Errors use `role="alert"` (assertive) so they interrupt;
// info/success use `role="status"` (polite) so they don't (PRD §8).
export function Toast({ message, tone = "info", onDismiss, className }: ToastProps): JSX.Element {
  return (
    <div
      className={cx("rc-toast", className)}
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
    >
      <span className="rc-toast__message">{message}</span>
      {onDismiss !== undefined && (
        <button
          type="button"
          className="rc-icon-btn"
          aria-label="Dispensar notificação"
          onClick={onDismiss}
        >
          <span aria-hidden="true">✕</span>
        </button>
      )}
    </div>
  );
}

export type ToastRegionProps = {
  readonly toasts: readonly ToastData[];
  readonly onDismiss: (id: string) => void;
};

// Fixed container that stacks active toasts. The region is the live boundary;
// individual toasts carry their own role.
export function ToastRegion({ toasts, onDismiss }: ToastRegionProps): JSX.Element {
  return (
    <div className="rc-toast-region" aria-label="Notificações">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          tone={toast.tone}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  );
}

export type UseToastsResult = {
  readonly toasts: readonly ToastData[];
  readonly show: (message: ReactNode, tone?: ToastTone) => string;
  readonly dismiss: (id: string) => void;
};

// Minimal toast queue. Generates ids, appends, and removes on dismiss; the host
// renders a <ToastRegion> with the returned `toasts`. Kept dependency-free and
// transport-agnostic so it is unit-testable.
export function useToasts(): UseToastsResult {
  const [toasts, setToasts] = useState<readonly ToastData[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: string): void => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((message: ReactNode, tone: ToastTone = "info"): string => {
    counter.current += 1;
    const id = `toast-${counter.current}`;
    setToasts((current) => [...current, { id, message, tone }]);
    return id;
  }, []);

  return { toasts, show, dismiss };
}
