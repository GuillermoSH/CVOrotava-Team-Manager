// components/ui/forms/FormTextarea.tsx
import React from "react";
import { FieldError, UseFormRegisterReturn } from "react-hook-form";

interface FormTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  name: string;
  register?: UseFormRegisterReturn;
  error?: FieldError;
}

export function FormTextarea({
  label,
  name,
  register,
  error,
  ...props
}: FormTextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-semibold text-[var(--text-secondary)]">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        {...register}
        {...props}
        className={`w-full mt-1 p-3 border rounded-xl bg-[var(--form-input-bg)] border-[color:var(--form-input-border)] text-[var(--text-primary)] placeholder-[color:var(--form-placeholder)] focus:outline-none focus:ring-2 transition-colors ${
          error
            ? "border-red-500 focus:ring-red-500"
            : "focus:ring-[var(--accent)] focus:border-[var(--accent)]"
        }`}
      />
      {error && <p className="text-xs text-red-400 mt-1">{error.message}</p>}
    </div>
  );
}
