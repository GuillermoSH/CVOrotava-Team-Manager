"use client";

import { useEffect, useState } from "react";
import { sileo } from "sileo";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowsRotate } from "@fortawesome/free-solid-svg-icons";

type LastSync = { finishedAt: string | null };

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Atlantic/Canary",
  }).format(new Date(iso));
}

/**
 * "Federación · actualizado lun 13 oct, 08:00" + botón de sincronizar (admin).
 * Los datos de competición llegan solos cada lunes (cron); el botón es para
 * resultados metidos tarde o partidos movidos entre semana.
 */
export default function FedSyncStatus({
  isAdmin,
  onSynced,
}: Readonly<{ isAdmin: boolean; onSynced: () => void }>) {
  const [last, setLast] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetch("/api/fed/sync")
      .then((res) => (res.ok ? (res.json() as Promise<LastSync>) : null))
      .then((data) => setLast(data?.finishedAt ?? null))
      .catch(() => setLast(null));
  }, []);

  const sync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/fed/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo sincronizar");
      setLast(data.last?.finishedAt ?? new Date().toISOString());
      const link = data.summary?.link;
      sileo.success({
        title: "Federación sincronizada",
        description: link
          ? `${link.updated} partidos actualizados · ${link.created} nuevos`
          : undefined,
      });
      onSynced();
    } catch (err: unknown) {
      sileo.error({ title: "Error al sincronizar", description: (err as Error).message });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <span>
        Federación · {last ? `actualizado ${formatWhen(last)}` : "sin sincronizar"}
      </span>
      {isAdmin && (
        <button
          type="button"
          onClick={sync}
          disabled={syncing}
          className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)] disabled:cursor-wait disabled:opacity-60"
        >
          <FontAwesomeIcon icon={faArrowsRotate} spin={syncing} />
          {syncing ? "Sincronizando…" : "Sincronizar ahora"}
        </button>
      )}
    </span>
  );
}
