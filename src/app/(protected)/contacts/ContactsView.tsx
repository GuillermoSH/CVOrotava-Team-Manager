"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCopy,
  faEnvelope,
  faLocationDot,
  faMagnifyingGlass,
  faPhone,
} from "@fortawesome/free-solid-svg-icons";
import { sileo } from "sileo";
import PageHeader from "@/components/ui/PageHeader";
import Select from "@/components/ui/Select";
import type { RivalClub } from "@/lib/contacts/rivalClubs";

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

function clubMatches(c: RivalClub, q: string) {
  return (
    norm(c.name).includes(q) ||
    norm(c.email ?? "").includes(q) ||
    norm(c.headquarter ?? "").includes(q) ||
    (c.phone ?? "").replace(/\s/g, "").includes(q.replace(/\s/g, ""))
  );
}

async function copy(value: string, what: string) {
  try {
    await navigator.clipboard.writeText(value);
    sileo.success({ title: `${what} copiado` });
  } catch {
    sileo.error({ title: "No se pudo copiar", description: value });
  }
}

function CopyLine({
  icon,
  value,
  what,
}: Readonly<{ icon: typeof faPhone; value: string; what: string }>) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <FontAwesomeIcon icon={icon} className="text-xs text-[var(--text-muted)]" />
      <span className="min-w-0 select-all break-all">{value}</span>
      <button
        type="button"
        onClick={() => copy(value, what)}
        aria-label={`Copiar ${what.toLowerCase()} de ${value}`}
        title={`Copiar ${what.toLowerCase()}`}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--glass-border)] text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        <FontAwesomeIcon icon={faCopy} />
      </button>
    </span>
  );
}

export default function ContactsView({
  clubs,
  season,
  seasons,
}: Readonly<{ clubs: RivalClub[]; season: string; seasons: string[] }>) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = norm(query.trim());
    return q ? clubs.filter((c) => clubMatches(c, q)) : clubs;
  }, [clubs, query]);

  const withoutContact = clubs.filter((c) => !c.phone && !c.email).length;

  return (
    <div className="flex w-full flex-col text-[var(--text-primary)]">
      <PageHeader
        title="Contactos"
        subtitle={`${clubs.length} clubes rivales en ${season}${
          withoutContact > 0 ? ` · ${withoutContact} sin datos de contacto` : ""
        } · datos públicos de la federación`}
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          aria-label="Temporada"
          size="compact"
          value={season}
          onChange={(s) => router.push(`/contacts?season=${encodeURIComponent(s)}`)}
          options={seasons.map((s) => ({ value: s, label: s }))}
        />
        <label className="relative block max-w-sm flex-1">
          <span className="sr-only">Buscar club</span>
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar club, correo o teléfono…"
            className="w-full rounded-xl border border-[var(--form-input-border)] bg-[var(--form-input-bg)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--form-placeholder)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-muted)]"
          />
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--text-muted)]">
          {clubs.length === 0
            ? "No hay clubes rivales sincronizados para esta temporada."
            : "Sin resultados."}
        </p>
      ) : (
        <ul className="divide-y divide-[var(--glass-border)] border-y border-[var(--glass-border)]">
          {visible.map((c) => (
            <li key={c.id} className="flex flex-col gap-2 py-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="font-semibold">{c.name}</p>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">{c.tournaments.join(" · ")}</p>
              </div>
              <div className="flex min-w-0 flex-col gap-1.5 text-sm lg:items-end">
                {c.phone ? <CopyLine icon={faPhone} value={c.phone} what="Teléfono" /> : null}
                {c.email ? <CopyLine icon={faEnvelope} value={c.email} what="Correo" /> : null}
                {c.headquarter ? (
                  <span className="inline-flex items-center gap-1.5 text-[var(--text-muted)]">
                    <FontAwesomeIcon icon={faLocationDot} className="text-xs" />
                    {c.headquarter}
                  </span>
                ) : null}
                {!c.phone && !c.email ? (
                  <span className="text-[var(--text-muted)]">Sin datos de contacto en la federación</span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
