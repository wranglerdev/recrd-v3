import { useId, type JSX, type SelectHTMLAttributes } from "react";
import { cx } from "./cx.js";
import "./ui.css";

export type SelectOption = {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
};

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
  readonly label: string;
  readonly hideLabel?: boolean;
  readonly options: readonly SelectOption[];
  readonly error?: string;
  readonly id?: string;
};

// Labelled native <select>. Native is used deliberately: it is fully accessible
// and keyboard-operable for free, matching the calm, low-chrome design (PRD §8).
export function Select({
  label,
  hideLabel = false,
  options,
  error,
  id,
  required,
  className,
  ...rest
}: SelectProps): JSX.Element {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const errorId = `${selectId}-error`;

  return (
    <div className="rc-field">
      <label
        htmlFor={selectId}
        className={cx("rc-field__label", hideLabel && "rc-visually-hidden")}
      >
        {label}
        {required && (
          <span className="rc-field__required" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <select
        id={selectId}
        className={cx("rc-field__control", className)}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <span id={errorId} className="rc-field__error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
