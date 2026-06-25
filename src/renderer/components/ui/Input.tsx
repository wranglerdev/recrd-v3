import { useId, type InputHTMLAttributes, type JSX } from "react";
import { cx } from "./cx.js";
import "./ui.css";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  readonly label: string;
  /** Hide the label visually while keeping it for assistive tech. */
  readonly hideLabel?: boolean;
  /** Validation message; sets aria-invalid and links via aria-describedby. */
  readonly error?: string;
  readonly id?: string;
};

// Labelled text input. The label is always present (visually or hidden) and the
// error is programmatically associated, so the control is never anonymous and
// validation is announced (PRD §8).
export function Input({
  label,
  hideLabel = false,
  error,
  id,
  required,
  className,
  ...rest
}: InputProps): JSX.Element {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className="rc-field">
      <label htmlFor={inputId} className={cx("rc-field__label", hideLabel && "rc-visually-hidden")}>
        {label}
        {required && (
          <span className="rc-field__required" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <input
        id={inputId}
        className={cx("rc-field__control", className)}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...rest}
      />
      {error && (
        <span id={errorId} className="rc-field__error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
