// components/ui/forms/FormSelect.tsx
import React from "react";
import { FieldError, UseFormRegisterReturn } from "react-hook-form";

interface FormSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  name: string;
  options: { value: string; label: string }[];
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
      <label htmlFor={name} className="text-sm font-semibold text-gray-700">
        {label}
      </label>
      <select
        id={name}
        name={name}
        {...register}
        {...props}
        className={`w-full mt-1 p-3 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${
          error
            ? "border-red-500 focus:ring-red-500"
            : "border-gray-300 focus:ring-red-600"
        }`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600 mt-1">{error.message}</p>}
    </div>
  );
}
