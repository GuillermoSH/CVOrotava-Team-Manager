// components/ui/forms/FormDate.tsx
import React from "react";
import { FieldError, UseFormRegisterReturn } from "react-hook-form";

interface FormDateProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  register?: UseFormRegisterReturn;
  error?: FieldError;
}

export function FormDate({
  label,
  name,
  register,
  error,
  ...props
}: FormDateProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-semibold text-gray-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="date"
        {...register}
        {...props}
        className={`w-full mt-1 p-3 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${
          error
            ? "border-red-500 focus:ring-red-500"
            : "border-gray-300 focus:ring-red-600"
        }`}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error.message}</p>}
    </div>
  );
}
