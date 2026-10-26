"use client";

import { useId, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserShield } from "@fortawesome/free-solid-svg-icons";
import { sileo } from "sileo";
import { useConfirmDialog } from "@/components/ui/useConfirmDialog";

export type ExemptionState = { reason: string | null } | null;

const SUGGESTED_REASONS = ["Coordinación", "Cuerpo técnico", "Directiva"];

type Props = {
  playerId: string;
  playerName: string;
  season: string;
  exemption: ExemptionState;
  /** Cuántas cuotas pendientes registradas tiene (se explica que dejan de contar). */
  pendingCount: number;
  /** Se llama tras guardar o quitar, para recargar las cuotas. */
  onChanged: () => void;
};

/** Marcar o quitar la exención de pagos de un jugador en una temporada. */
export default function ExemptionPanel({
  playerId,
  playerName,
  season,
  exemption,
  pendingCount,
  onChanged,
}: Readonly<Props>) {
  const { ask, dialog } = useConfirmDialog();
  const listId = useId();
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [clearOnMark, setClearOnMark] = useState(false);

  async function call(method: "PUT" | "DELETE") {
    setBusy(true);
    try {
      const res =
        method === "PUT"
          ? await fetch("/api/payments/exemptions", {
              method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                player_id: playerId,
                season,
                reason: reason.trim() || null,
                clear_pending: clearOnMark && pendingCount > 0,
              }),
            })
          : await fetch(
              `/api/payments/exemptions?player_id=${encodeURIComponent(playerId)}&season=${encodeURIComponent(season)}`,
              { method }
            );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "No se pudo guardar la exención");
      sileo.success({
        title: method === "PUT" ? "Marcado como exento" : "Exención quitada",
        description: json.removed > 0 ? `${json.removed} pago${json.removed === 1 ? "" : "s"} pendiente${json.removed === 1 ? "" : "s"} quitado${json.removed === 1 ? "" : "s"}` : undefined,
      });
      if (json.warning) sileo.warning({ title: "Exención guardada", description: json.warning });
      setEditing(false);
      setReason("");
      setClearOnMark(false);
      onChanged();
    } catch (err: unknown) {
      sileo.error({ title: "No se pudo guardar", description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function clearPending() {
    const ok = await ask({
      title: "Quitar pagos pendientes",
      description: (
        <>
          Se borrarán los {pendingCount} pago{pendingCount === 1 ? "" : "s"} pendiente{pendingCount === 1 ? "" : "s"} de{" "}
          <span className="font-medium text-[var(--text-primary)]">{playerName}</span> en {season}. Los pagos ya cobrados no se
          tocan. Esta acción no se puede deshacer.
        </>
      ),
      confirmLabel: "Quitar pendientes",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch("/api/payments/exemptions/clear-pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_id: playerId, season }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "No se pudieron quitar los pagos pendientes");
      sileo.success({ title: "Pagos pendientes quitados" });
      onChanged();
    } catch (err: unknown) {
      sileo.error({ title: "No se pudo quitar", description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const ok = await ask({
      title: "Quitar exención",
      description: (
        <>
          <span className="font-medium text-[var(--text-primary)]">{playerName}</span> volverá a recibir cuotas en{" "}
          {season} y sus pagos pendientes contarán como deuda.
        </>
      ),
      confirmLabel: "Quitar exención",
    });
    if (ok) await call("DELETE");
  }

  if (exemption) {
    return (
      <section className="mb-5 flex flex-col gap-3 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-faint)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        {dialog}
        <div className="flex min-w-0 items-start gap-3">
          <FontAwesomeIcon icon={faUserShield} className="mt-0.5 text-[var(--accent)]" aria-hidden />
          <div className="min-w-0 text-sm">
            <p className="font-semibold">
              Exento de pagos en {season}
              {exemption.reason ? <span className="font-normal text-[var(--text-secondary)]"> · {exemption.reason}</span> : null}
            </p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              No recibe cuotas previstas ni asignaciones.
              {pendingCount > 0
                ? ` Tiene ${pendingCount} pago${pendingCount === 1 ? "" : "s"} pendiente${pendingCount === 1 ? "" : "s"} registrado${pendingCount === 1 ? "" : "s"}: no cuenta${pendingCount === 1 ? "" : "n"} como deuda, pero puedes quitarlo${pendingCount === 1 ? "" : "s"}.`
                : ""}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {pendingCount > 0 ? (
            <button
              type="button"
              onClick={clearPending}
              disabled={busy}
              className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--glass-border)] px-3 text-sm font-medium text-[var(--color-danger)] transition-colors hover:border-[var(--color-danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
            >
              Quitar pendientes
            </button>
          ) : null}
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--glass-border)] px-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
          >
            Quitar exención
          </button>
        </div>
      </section>
    );
  }

  if (!editing) {
    return (
      <div className="mb-5">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-[var(--glass-border)] px-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <FontAwesomeIcon icon={faUserShield} className="text-xs" aria-hidden />
          Marcar como exento
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void call("PUT");
      }}
      className="mb-5 flex flex-col gap-3 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-faint)] p-4 sm:flex-row sm:items-end"
    >
      <div className="min-w-0 flex-1">
      <label className="block text-sm">
        <span className="font-medium">Motivo de la exención en {season}</span>
        <input
          type="text"
          list={listId}
          value={reason}
          maxLength={200}
          autoFocus
          onChange={(e) => setReason(e.target.value)}
          placeholder="Opcional: p. ej. Coordinación"
          className="mt-1.5 block min-h-10 w-full rounded-lg border border-[var(--form-input-border)] bg-[var(--form-input-bg)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--form-placeholder)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-muted)]"
        />
        <datalist id={listId}>
          {SUGGESTED_REASONS.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
      </label>
        {pendingCount > 0 ? (
          <label className="mt-2.5 flex cursor-pointer items-start gap-2 text-xs text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={clearOnMark}
              onChange={(e) => setClearOnMark(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Quitar también sus {pendingCount} pago{pendingCount === 1 ? "" : "s"} pendiente{pendingCount === 1 ? "" : "s"}{" "}
              (se borran; los pagos ya cobrados no se tocan)
            </span>
          </label>
        ) : null}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setReason("");
            setClearOnMark(false);
          }}
          disabled={busy}
          className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-[var(--glass-border)] px-3.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={busy}
          className="btn-primary inline-flex h-10 items-center justify-center px-4 text-sm disabled:opacity-50"
        >
          {busy ? "Guardando…" : "Marcar exento"}
        </button>
      </div>
    </form>
  );
}
