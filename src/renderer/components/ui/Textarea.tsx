import { useId, type JSX, type TextareaHTMLAttributes } from "react";
import { cx } from "./cx.js";
import "./ui.css";

export type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & {
  readonly label: string;
  readonly hideLabel?: boolean;
  readonly error?: string;
  readonly id?: string;
};

// Labelled multi-line text control, mirroring Input's contract (PRD §8): the
// label is always present and the error is programmatically associated.
export function Textarea({
  label,
  hideLabel = false,
  error,
  id,
  required,
  className,
  ...rest
}: TextareaProps): JSX.Element {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const errorId = `${textareaId}-error`;

  return (
    <div className="rc-field">
      <label
        htmlFor={textareaId}
        className={cx("rc-field__label", hideLabel && "rc-visually-hidden")}
      >
        {label}
        {required && (
          <span className="rc-field__required" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <textarea
        id={textareaId}
        className={cx("rc-field__control", "rc-field__control--textarea", className)}
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
