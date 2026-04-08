import React from "react";
import { FieldError, UseFormRegisterReturn } from "react-hook-form";

interface BaseOption {
  value: string;
  label: string;
}

interface GroupedOption {
  label: string;
  options: BaseOption[];
}

interface FormSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  name: string;
  options: (BaseOption | GroupedOption)[];
  register?: UseFormRegisterReturn;
  error?: FieldError;
}

export function FormSelect({
  label,
  name,
  options,
  register,
  error,
  ...props
}: FormSelectProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-semibold text-[var(--text-secondary)]">
        {label}
      </label>
      <select
        id={name}
        name={name}
        {...register}
        {...props}
        className={`w-full mt-1 p-3 border rounded-xl bg-[var(--form-input-bg)] border-[color:var(--form-input-border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 transition-colors ${
          error
            ? "border-red-500 focus:ring-red-500"
            : "focus:ring-[var(--accent)] focus:border-[var(--accent)]"
        }`}
      >
        <option value="" className="bg-[var(--color-bg-elevated)] text-[var(--text-muted)]">
          Selecciona una opción
        </option>

        {options.map((opt) =>
          "options" in opt ? (
            <optgroup key={opt.label} label={opt.label} className="bg-[var(--color-bg-elevated)]">
              {opt.options.map((sub) => (
                <option key={sub.value} value={sub.value} className="bg-[var(--color-bg-elevated)] text-[var(--text-primary)]">
                  {sub.label}
                </option>
              ))}
            </optgroup>
          ) : (
            <option key={opt.value} value={opt.value} className="bg-[var(--color-bg-elevated)] text-[var(--text-primary)]">
              {opt.label}
            </option>
          )
        )}
      </select>

      {error && <p className="text-xs text-red-400 mt-1">{error.message}</p>}
    </div>
  );
}
