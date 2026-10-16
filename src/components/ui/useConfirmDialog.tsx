"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import ConfirmDialog, { type ConfirmDialogTone } from "./ConfirmDialog";

export type ConfirmRequest = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmDialogTone;
};

type Pending = ConfirmRequest & {
  resolve: (ok: boolean) => void;
};

/**
 * API tipo confirm(): `const ok = await ask({ title, description, ... })`.
 * Monta `{dialog}` una vez en el árbol del componente.
 * El contenido se conserva hasta terminar el exit (evita flicker al cerrar).
 */
export function useConfirmDialog() {
  const [pending, setPending] = useState<Pending | null>(null);
  const [open, setOpen] = useState(false);
  const pendingRef = useRef<Pending | null>(null);

  const ask = useCallback((req: ConfirmRequest) => {
    return new Promise<boolean>((resolve) => {
      const next: Pending = { ...req, resolve };
      pendingRef.current = next;
      setPending(next);
      setOpen(true);
    });
  }, []);

  const settle = useCallback((ok: boolean) => {
    const current = pendingRef.current;
    pendingRef.current = null;
    setOpen(false);
    current?.resolve(ok);
  }, []);

  const onExitComplete = useCallback(() => {
    setPending(null);
  }, []);

  const dialog = (
    <ConfirmDialog
      open={open}
      title={pending?.title ?? ""}
      description={pending?.description}
      confirmLabel={pending?.confirmLabel}
      cancelLabel={pending?.cancelLabel}
      tone={pending?.tone}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
      onExitComplete={onExitComplete}
    />
  );

  return { ask, dialog };
}
