// components/ui/forms/FormLayout.tsx
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import React from "react";

interface FormLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  loading?: boolean;
  buttonText: string;
  onDelete?: () => void;
}

export function FormLayout({
  title,
  description,
  children,
  onSubmit,
  loading,
  buttonText,
  onDelete,
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

      <div className="flex gap-2 justify-end">
        <button
          type="submit"
          disabled={loading}
          className="bg-red-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-red-700 transition disabled:opacity-50"
        >
          {loading ? "Guardando..." : buttonText}
        </button>
        {onDelete && (<button
          type="button"
          onClick={onDelete}
          className="bg-gray-500 text-white font-semibold p-3 rounded-xl hover:bg-gray-600 transition"
        >
          <FontAwesomeIcon icon={faTrash} />
        </button>
        )}
      </div>
    </form>
  );
}
