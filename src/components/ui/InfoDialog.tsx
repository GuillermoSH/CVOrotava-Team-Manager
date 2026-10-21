"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { DialogLayer } from "./ConfirmDialog";

const EXIT_FALLBACK_MS = 400;

/**
 * Ventana para leer algo largo (explicaciones, ayuda) sin ensanchar la página.
 * Comparte fondo, animaciones y bloqueo de scroll con ConfirmDialog; el cuerpo hace scroll
 * dentro de la ventana y en móvil se pega abajo como una hoja.
 */
export default function InfoDialog({
  open,
  title,
  onClose,
  children,
}: Readonly<{ open: boolean; title: string; onClose: () => void; children: ReactNode }>) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const mounted = typeof document !== "undefined";

  const [prevOpen, setPrevOpen] = useState(open);
  const [exiting, setExiting] = useState(false);
  if (prevOpen !== open) {
    setPrevOpen(open);
    setExiting(!open);
  }
  const visible = open || exiting;

  const finishExit = useCallback(() => setExiting(false), []);
  useEffect(() => {
    if (!exiting) return;
    const t = window.setTimeout(finishExit, EXIT_FALLBACK_MS);
    return () => window.clearTimeout(t);
  }, [exiting, finishExit]);

  const state = open ? "open" : "closed";

  const tree = visible ? (
    <div className="fixed inset-0 z-[var(--z-popover)] flex items-end justify-center overscroll-none sm:items-center sm:p-4">
      <DialogLayer busy={false} onCancel={onClose} confirmRef={closeRef} />
      <div
        data-state={state}
        className="dialog-backdrop absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-state={state}
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget && exiting) finishExit();
        }}
        className="dialog-panel relative flex max-h-[88dvh] w-full max-w-2xl flex-col rounded-t-2xl border border-[var(--glass-border)] bg-[var(--color-bg-elevated)] shadow-2xl sm:max-h-[85dvh] sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--glass-border)] px-5 py-4">
          <h2 id={titleId} className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="-mr-2 -mt-1 inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-surface)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5"
          style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))" }}
        >
          {children}
        </div>
      </div>
    </div>
  ) : null;

  if (!mounted) return tree;
  return createPortal(tree, document.body);
}
