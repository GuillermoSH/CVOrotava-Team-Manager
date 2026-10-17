"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";

export type ConfirmDialogTone = "default" | "danger";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmDialogTone;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Tras la animación de salida (para limpiar estado sin flicker). */
  onExitComplete?: () => void;
};

/**
 * Diálogo de confirmación del club (sustituye window.confirm).
 * Portal a body + bloqueo de scroll; z-popover encima de otros modales.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "default",
  busy = false,
  onConfirm,
  onCancel,
  onExitComplete,
}: Readonly<ConfirmDialogProps>) {
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const descId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const mounted = typeof document !== "undefined";

  useEffect(() => {
    if (!open) return;

    const html = document.documentElement;
    const { body } = document;
    const scrollY = window.scrollY;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyLeft = body.style.left;
    const prevBodyRight = body.style.right;
    const prevBodyWidth = body.style.width;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", onKey);

    const focusTimer = window.setTimeout(() => confirmRef.current?.focus(), 40);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.left = prevBodyLeft;
      body.style.right = prevBodyRight;
      body.style.width = prevBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [open, busy, onCancel]);

  const confirmClass =
    tone === "danger"
      ? "bg-[var(--color-danger)] text-white hover:brightness-110"
      : "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]";

  // Misma coreografía que MatchModal / PaymentModal.
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };
  const panelVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: reduceMotion
        ? { duration: 0 }
        : { type: "spring" as const, stiffness: 300, damping: 25 },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 10,
      transition: { duration: reduceMotion ? 0 : 0.2 },
    },
  };

  const tree = (
    <AnimatePresence onExitComplete={onExitComplete}>
      {open ? (
        <div
          key="confirm-dialog"
          className="fixed inset-0 z-[var(--z-popover)] flex items-center justify-center overscroll-none p-4"
        >
          <motion.div
            variants={backdropVariants}
            initial={reduceMotion ? false : "hidden"}
            animate="visible"
            exit="hidden"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              if (!busy) onCancel();
            }}
            onWheel={(e) => e.preventDefault()}
            onTouchMove={(e) => e.preventDefault()}
            aria-hidden
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            variants={panelVariants}
            initial={reduceMotion ? false : "hidden"}
            animate="visible"
            exit="exit"
            className="relative w-full max-w-md rounded-2xl border border-[var(--glass-border)] bg-[var(--color-bg-elevated)] p-5 shadow-2xl"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 id={titleId} className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
                {title}
              </h2>
              <button
                type="button"
                onClick={onCancel}
                disabled={busy}
                aria-label="Cerrar"
                className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-surface)] hover:text-[var(--text-primary)] disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            {description ? (
              <div id={descId} className="text-sm leading-relaxed text-[var(--text-secondary)]">
                {description}
              </div>
            ) : null}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onCancel}
                disabled={busy}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-[var(--glass-border)] bg-[var(--glass-surface)] px-4 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                ref={confirmRef}
                type="button"
                onClick={onConfirm}
                disabled={busy}
                className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl px-4 text-sm font-semibold transition-colors disabled:opacity-50 ${confirmClass}`}
              >
                {busy ? "Trabajando…" : confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );

  if (!mounted) return tree;
  return createPortal(tree, document.body);
}
