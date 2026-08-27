"use client";

import {
  Controller,
  type Control,
  type FieldError,
} from "react-hook-form";
import Select, { type SelectOptions } from "@/components/ui/Select";

interface FormSelectProps {
  label: string;
  name: string;
  options: SelectOptions;
  error?: FieldError;
  // RHF Control is invariant; forms pass their own values type.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control?: Control<any>;
  value?: string;
  onChange?: (e: { target: { name: string; value: string } }) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function FormSelect({
  label,
  name,
  options,
  error,
  control,
  value,
  onChange,
  disabled,
  placeholder = "Selecciona una opción",
}: FormSelectProps) {
  const field = (
    current: string,
    setValue: (next: string) => void,
    onBlur?: () => void
  ) => (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={name}
        className="text-sm font-semibold text-[var(--text-secondary)]"
      >
        {label}
      </label>
      <Select
        id={name}
        value={current}
        onChange={setValue}
        onBlur={onBlur}
        options={options}
        placeholder={placeholder}
        disabled={disabled}
        error={Boolean(error)}
      />
      {error ? (
        <p className="mt-1 text-xs text-red-400">{error.message}</p>
      ) : null}
    </div>
  );

  if (control) {
    return (
      <Controller
        control={control}
        name={name}
        render={({ field: f }) =>
          field(String(f.value ?? ""), f.onChange, f.onBlur)
        }
      />
    );
  }

  return field(value ?? "", (next) => {
    onChange?.({ target: { name, value: next } });
  });
}
