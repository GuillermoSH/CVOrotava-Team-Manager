"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
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

/** Margen sobre la duración de la animación de salida por si `animationend` no llega (pestaña oculta). */
const EXIT_FALLBACK_MS = 400;

/**
 * Bloqueo de scroll, Escape y foco inicial. Vive mientras el diálogo está en pantalla,
 * incluida la animación de salida. Al quitar el scroll se reserva el hueco de la barra
 * (`scrollbar-gutter`): si el viewport cambiara de ancho, los elementos fijos (menú, fondo
 * ambiental con desenfoques grandes) se repintarían y la ventana parpadearía.
 */
export function DialogLayer({
  busy,
  onCancel,
  confirmRef,
}: {
  busy: boolean;
  onCancel: () => void;
  confirmRef: React.RefObject<HTMLButtonElement | null>;
}) {
  // El último valor sin reinstalar el bloqueo en cada render del padre.
  const latest = useRef({ busy, onCancel });
  useEffect(() => {
    latest.current = { busy, onCancel };
  });

  useEffect(() => {
    const html = document.documentElement;
    const { body } = document;
    const prevHtmlOverflow = html.style.overflow;
    const prevGutter = html.style.scrollbarGutter;
    const prevBodyPaddingRight = body.style.paddingRight;
    const scrollbar = window.innerWidth - html.clientWidth;

    html.style.overflow = "hidden";
    if (scrollbar > 0) {
      if (CSS.supports("scrollbar-gutter", "stable")) {
        html.style.scrollbarGutter = "stable";
      } else {
        // Sin soporte: compensar el ancho en el body (el viewport sí cambiará).
        const current = Number.parseFloat(getComputedStyle(body).paddingRight) || 0;
        body.style.paddingRight = `${current + scrollbar}px`;
      }
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !latest.current.busy) latest.current.onCancel();
    };
    document.addEventListener("keydown", onKey);
    const focusTimer = window.setTimeout(() => confirmRef.current?.focus(), 40);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      html.style.overflow = prevHtmlOverflow;
      html.style.scrollbarGutter = prevGutter;
      body.style.paddingRight = prevBodyPaddingRight;
    };
  }, [confirmRef]);

  return null;
}

/**
 * Diálogo de confirmación del club (sustituye window.confirm).
 * Portal a body; z-popover encima de otros modales. La entrada y la salida son animaciones
 * CSS (opacity y transform), que corren en el compositor: no se entrecortan cuando la página
 * se repinta al confirmar (petición, actualización de la lista…). Con «reducir movimiento»
 * solo queda el fundido (ver globals.css).
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
  const titleId = useId();
  const descId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const mounted = typeof document !== "undefined";

  // `exiting` mantiene el diálogo en pantalla durante la animación de salida.
  const [prevOpen, setPrevOpen] = useState(open);
  const [exiting, setExiting] = useState(false);
  if (prevOpen !== open) {
    setPrevOpen(open);
    setExiting(!open);
  }
  const visible = open || exiting;

  const exitCallback = useRef(onExitComplete);
  useEffect(() => {
    exitCallback.current = onExitComplete;
  });

  const finishExit = useCallback(() => {
    setExiting(false);
    exitCallback.current?.();
  }, []);

  useEffect(() => {
    if (!exiting) return;
    const t = window.setTimeout(finishExit, EXIT_FALLBACK_MS);
    return () => window.clearTimeout(t);
  }, [exiting, finishExit]);

  const confirmClass =
    tone === "danger"
      ? "bg-[var(--color-danger)] text-white hover:brightness-110"
      : "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]";

  const state = open ? "open" : "closed";

  const tree = visible ? (
    <div className="fixed inset-0 z-[var(--z-popover)] flex items-center justify-center overscroll-none p-4">
      <DialogLayer busy={busy} onCancel={onCancel} confirmRef={confirmRef} />
      <div
        data-state={state}
        className="dialog-backdrop absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => {
          if (!busy) onCancel();
        }}
        aria-hidden
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        data-state={state}
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget && exiting) finishExit();
        }}
        className="dialog-panel relative w-full max-w-md rounded-2xl border border-[var(--glass-border)] bg-[var(--color-bg-elevated)] p-5 shadow-2xl"
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
      </div>
    </div>
  ) : null;

  if (!mounted) return tree;
  return createPortal(tree, document.body);
}
