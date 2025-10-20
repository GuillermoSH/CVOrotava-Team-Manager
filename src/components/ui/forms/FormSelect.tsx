import React from "react";
import { FieldError, UseFormRegisterReturn } from "react-hook-form";

interface BaseOption {
  value: string;
  label: string;
}

interface GroupedOption {
  label: string; // encabezado del grupo
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
        <option value="">Selecciona una opción</option>

        {/* Soporte para grupos o lista plana */}
        {options.map((opt) =>
          "options" in opt ? (
            <optgroup key={opt.label} label={opt.label}>
              {opt.options.map((sub) => (
                <option key={sub.value} value={sub.value}>
                  {sub.label}
                </option>
              ))}
            </optgroup>
          ) : (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          )
        )}
      </select>

      {error && <p className="text-xs text-red-600 mt-1">{error.message}</p>}
    </div>
  );
}
