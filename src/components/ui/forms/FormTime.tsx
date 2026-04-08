// components/ui/forms/FormTime.tsx
import React from "react";
import { FieldError, UseFormRegisterReturn } from "react-hook-form";

interface FormTimeProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  register?: UseFormRegisterReturn;
  error?: FieldError;
}

export function FormTime({
  label,
  name,
  register,
  error,
  ...props
}: FormTimeProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-semibold text-[var(--text-secondary)]">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="time"
        {...register}
        {...props}
        className={`w-full mt-1 p-3 border rounded-xl bg-[var(--form-input-bg)] border-[color:var(--form-input-border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 transition-colors ${
          error
            ? "border-red-500 focus:ring-red-500"
            : "focus:ring-[var(--accent)] focus:border-[var(--accent)]"
        }`}
      />
      {error && <p className="text-xs text-red-400 mt-1">{error.message}</p>}
    </div>
  );
}
