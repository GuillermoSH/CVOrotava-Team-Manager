"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { sileo } from "sileo";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faCodeMerge,
  faMagnifyingGlass,
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";
import PageHeader from "@/components/ui/PageHeader";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Select from "@/components/ui/Select";
import type { AdminVenue, LocationType } from "@/lib/venues/adminVenues";
import { planVenueMerges } from "@/lib/venues/adminVenues";

const LOCATION_LABEL: Record<LocationType, string> = {
  home: "Casa",
  away: "Fuera",
  outside_island: "Viaje",
};

type Tab = "pending" | "all";

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Error");
  return json;
}

export default function VenuesView({ initialVenues }: Readonly<{ initialVenues: AdminVenue[] }>) {
  const router = useRouter();
  const [venues, setVenues] = useState(initialVenues);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const pendingCount = venues.filter((v) => v.needs_review).length;
  const [tab, setTab] = useState<Tab>(pendingCount > 0 ? "pending" : "all");
  const [mergeTarget, setMergeTarget] = useState<Record<string, string>>({});

  useEffect(() => setVenues(initialVenues), [initialVenues]);

  const suggestedMerges = useMemo(() => planVenueMerges(venues), [venues]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return venues
      .filter((v) => (tab === "pending" ? v.needs_review : true))
      .filter(
        (v) =>
          !q ||
          v.venue_name.toLowerCase().includes(q) ||
          v.team_name.toLowerCase().includes(q) ||
          v.aliases.some((a) => a.toLowerCase().includes(q))
      );
  }, [venues, tab, query]);

  const mergeOptions = (self: string) =>
    venues
      .filter((v) => v.id !== self)
      .map((v) => ({ value: v.id, label: `${v.venue_name} · ${v.team_name}` }));

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try {
      await fn();
      sileo.success({ title: ok });
      router.refresh();
    } catch (err: unknown) {
      sileo.error({ title: "No se pudo guardar", description: (err as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const setLocation = (v: AdminVenue, location_type: LocationType) =>
    run(v.id, () => call(`/api/venues/${v.id}`, "PATCH", { location_type }), `${v.venue_name}: ${LOCATION_LABEL[location_type]}`);

  const confirm = (v: AdminVenue) =>
    run(v.id, () => call(`/api/venues/${v.id}`, "PATCH", { reviewed: true }), `${v.venue_name} revisado`);

  const merge = (v: AdminVenue, into: string, intoName: string) => {
    if (!window.confirm(`¿Fusionar «${v.venue_name}» en «${intoName}»? Sus partidos pasan a ese pabellón.`)) return;
    return run(v.id, () => call(`/api/venues/${v.id}/merge`, "POST", { into }), `Fusionado en ${intoName}`);
  };

  const applySuggestions = () =>
    run("all", () => call("/api/venues/reconcile", "POST"), `${suggestedMerges.length} pabellones fusionados`);

  return (
    <div>
      <PageHeader
        title="Pabellones"
        subtitle={
          <>
            {venues.length} pabellones
            {pendingCount > 0 && (
              <span className="text-[var(--color-warning)]"> · {pendingCount} pendientes de revisar</span>
            )}
          </>
        }
        actions={
          suggestedMerges.length > 0 ? (
            <button
              type="button"
              className="btn-primary flex items-center gap-2"
              disabled={busy !== null}
              onClick={applySuggestions}
            >
              <FontAwesomeIcon icon={faWandMagicSparkles} />
              Aplicar {suggestedMerges.length} fusiones sugeridas
            </button>
          ) : null
        }
      />

      <p className="mb-4 text-sm text-[var(--text-muted)]">
        La federación publica el mismo pabellón con varios nombres. Fusiona los duplicados y
        marca si es casa, fuera (misma isla) o viaje (otra isla): se aplica a todos sus partidos.
      </p>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SegmentedControl
          aria-label="Filtrar pabellones"
          value={tab}
          onChange={setTab}
          options={[
            { value: "pending", label: `Pendientes (${pendingCount})` },
            { value: "all", label: "Todos" },
          ]}
        />
        <label className="relative block flex-1">
          <span className="sr-only">Buscar pabellón</span>
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar pabellón o equipo…"
            className="w-full rounded-xl border border-[var(--form-input-border)] bg-[var(--form-input-bg)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--form-placeholder)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-muted)]"
          />
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--text-muted)]">
          {tab === "pending" ? "No hay pabellones pendientes de revisar." : "Sin resultados."}
        </p>
      ) : (
        <ul className="divide-y divide-[var(--glass-border)] border-y border-[var(--glass-border)]">
          {visible.map((v) => (
            <li key={v.id} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-[var(--text-primary)]">
                  {v.venue_name}
                  {v.needs_review && (
                    <span className="ml-2 rounded-md bg-[var(--color-warning-muted,transparent)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-warning)]">
                      Pendiente
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {v.team_name} · {v.matches_count} partido{v.matches_count === 1 ? "" : "s"}
                </p>
                {v.aliases.length > 0 && (
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    En la federación también: {v.aliases.join(" · ")}
                  </p>
                )}
                {!v.suggestion && v.clubHint && (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => merge(v, v.clubHint!.id, v.clubHint!.venue_name)}
                    className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-left text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] disabled:opacity-50"
                  >
                    <FontAwesomeIcon icon={faCodeMerge} className="shrink-0" />
                    <span>
                      {v.clubHint.club_name} también juega de local en {v.clubHint.venue_name} (
                      {LOCATION_LABEL[v.clubHint.location_type]}). ¿Es el mismo? Fusionar
                    </span>
                  </button>
                )}
                {v.suggestion && (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => merge(v, v.suggestion!.id, v.suggestion!.venue_name)}
                    className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] disabled:opacity-50"
                  >
                    <FontAwesomeIcon icon={faCodeMerge} />
                    ¿Es {v.suggestion.venue_name} ({LOCATION_LABEL[v.suggestion.location_type]})? Fusionar
                  </button>
                )}
              </div>

              <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                <SegmentedControl
                  aria-label={`Tipo de ${v.venue_name}`}
                  value={v.location_type}
                  onChange={(t) => setLocation(v, t)}
                  options={(Object.keys(LOCATION_LABEL) as LocationType[]).map((t) => ({
                    value: t,
                    label: LOCATION_LABEL[t],
                  }))}
                />
                {v.needs_review && (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => confirm(v)}
                    className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--glass-border)] px-3 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--glass-surface)] disabled:opacity-50"
                  >
                    <FontAwesomeIcon icon={faCheck} className="text-[0.7rem]" />
                    Correcto
                  </button>
                )}
                <div className="flex items-center gap-2">
                  <Select
                    size="compact"
                    value={mergeTarget[v.id] ?? ""}
                    onChange={(id) => setMergeTarget((m) => ({ ...m, [v.id]: id }))}
                    options={mergeOptions(v.id)}
                    placeholder="Fusionar con…"
                    disabled={busy !== null}
                  />
                  {mergeTarget[v.id] && (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() =>
                        merge(v, mergeTarget[v.id], venues.find((x) => x.id === mergeTarget[v.id])?.venue_name ?? "")
                      }
                      className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--glass-border)] px-3 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--glass-surface)] disabled:opacity-50"
                    >
                      <FontAwesomeIcon icon={faCodeMerge} className="text-[0.7rem]" />
                      Fusionar
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
