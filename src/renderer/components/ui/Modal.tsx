import { useEffect, useId, useRef, type JSX, type ReactNode } from "react";
import { cx } from "./cx.js";
import "./ui.css";

export type ModalProps = {
  readonly open: boolean;
  readonly title: ReactNode;
  readonly onClose: () => void;
  readonly children: ReactNode;
  /** Footer actions (e.g. confirm/cancel buttons), aligned to the right. */
  readonly footer?: ReactNode;
  /** Close when the backdrop is clicked (default true). */
  readonly closeOnOverlay?: boolean;
  readonly className?: string;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

// Accessible modal dialog (PRD §8). Renders `role="dialog"` with `aria-modal`,
// labelled by its title, traps Tab focus within the panel, closes on Escape and
// restores focus to the previously-focused element on unmount.
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  closeOnOverlay = true,
  className,
}: ModalProps): JSX.Element | null {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    previouslyFocused.current = document.activeElement;
    const panel = panelRef.current;
    // Move focus into the dialog so keyboard users start inside it.
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    return () => {
      // Restore focus to whatever was focused before opening.
      if (previouslyFocused.current instanceof HTMLElement) {
        previouslyFocused.current.focus();
      }
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") {
      return;
    }
    const panel = panelRef.current;
    if (panel === null) {
      return;
    }
    const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  return (
    <div
      className="rc-modal__overlay"
      onClick={closeOnOverlay ? onClose : undefined}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx("rc-modal", className)}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <header className="rc-modal__header">
          <h2 id={titleId} className="rc-modal__title">
            {title}
          </h2>
          <button
            type="button"
            className="rc-icon-btn"
            aria-label="Fechar"
            title="Fechar"
            onClick={onClose}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </header>
        <div className="rc-modal__body">{children}</div>
        {footer !== undefined && <footer className="rc-modal__footer">{footer}</footer>}
      </div>
    </div>
  );
}
