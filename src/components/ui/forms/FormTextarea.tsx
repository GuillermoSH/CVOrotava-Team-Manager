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
      <label htmlFor={name} className="text-sm font-semibold text-gray-700">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
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
