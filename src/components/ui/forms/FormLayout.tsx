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
      className="flex flex-col w-full gap-4 md:gap-6 card-glass p-6 sm:p-8"
    >
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-1">{title}</h1>
        {description && (
          <p className="text-sm text-[var(--text-muted)]">{description}</p>
        )}
      </div>

      <div className="w-full h-px bg-white/5" />

      {children}

      <div className="flex gap-2 justify-end pt-2">
        <button
          type="submit"
          disabled={loading}
          className="btn-primary py-2.5 px-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Guardando...
            </span>
          ) : (
            buttonText
          )}
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="btn-secondary !px-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 hover:border-red-500/20"
          >
            <FontAwesomeIcon icon={faTrash} />
          </button>
        )}
      </div>
    </form>
  );
}
