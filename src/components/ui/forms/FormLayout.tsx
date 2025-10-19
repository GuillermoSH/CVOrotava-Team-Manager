// components/ui/forms/FormLayout.tsx
import React from "react";

interface FormLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  loading?: boolean;
  buttonText: string;
}

export function FormLayout({
  title,
  description,
  children,
  onSubmit,
  loading,
  buttonText,
}: FormLayoutProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col w-full gap-3 md:gap-6 text-gray-800 bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-gray-200 p-6 sm:p-10"
    >
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{title}</h1>
        {description && (
          <p className="text-sm text-gray-500 mb-1">{description}</p>
        )}
      </div>

      {children}

      <button
        type="submit"
        disabled={loading}
        className="self-end bg-red-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-red-700 transition disabled:opacity-50"
      >
        {loading ? "Guardando..." : buttonText}
      </button>
    </form>
  );
}
