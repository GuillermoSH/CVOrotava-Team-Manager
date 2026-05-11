"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink, faCheck, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";

export type UnmatchedRow = {
  raw: string;
  normalized: string;
  matches_count: number;
  suggested_canonical: string | null;
  suggested_team_name: string | null;
  suggested_distance: number | null;
};

export type StandingOption = {
  normalized_name: string;
  team_name: string;
};

type Props = {
  unmatched: UnmatchedRow[];
  candidates: StandingOption[];
  onResolved: () => void | Promise<void>;
};

/**
 * Lista de rivales (de matches.opponent) que no encajan con ninguna fila del standings.
 * Para cada uno, dropdown con todos los equipos del standings + botón "Vincular" que
 * crea fila en team_aliases vía POST /api/team-aliases.
 */
export default function AliasResolver({ unmatched, candidates, onResolved }: Props) {
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [linked, setLinked] = useState<Record<string, string>>({});

  const sortedCandidates = [...candidates].sort((a, b) =>
    a.team_name.localeCompare(b.team_name, "es")
  );

  const handleLink = async (
    row: UnmatchedRow,
    canonicalNormalized: string
  ) => {
    if (!canonicalNormalized) return;
    setPending((p) => ({ ...p, [row.raw]: true }));
    setErrors((e) => ({ ...e, [row.raw]: "" }));

    try {
      const res = await fetch("/api/team-aliases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alias: row.raw,
          canonical:
            candidates.find((c) => c.normalized_name === canonicalNormalized)
              ?.team_name ?? canonicalNormalized,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const message =
          typeof json.error === "string"
            ? json.error
            : "No se pudo crear el alias.";
        throw new Error(message);
      }
      setLinked((l) => ({ ...l, [row.raw]: canonicalNormalized }));
      await onResolved();
    } catch (err) {
      setErrors((e) => ({
        ...e,
        [row.raw]: err instanceof Error ? err.message : String(err),
      }));
    } finally {
      setPending((p) => ({ ...p, [row.raw]: false }));
    }
  };

  if (unmatched.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-glass border-amber-500/30 bg-amber-500/5 p-5 sm:p-6"
    >
      <div className="mb-4 flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
          <FontAwesomeIcon icon={faTriangleExclamation} />
        </span>
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Rivales sin coincidencia
          </h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Estos nombres aparecen en partidos registrados pero no encajan con la
            clasificación subida. Vincúlalos al equipo correcto para que cuenten
            en las estadísticas.
          </p>
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {unmatched.map((u) => {
          const defaultValue = linked[u.raw] ?? u.suggested_canonical ?? "";
          const isLinked = Boolean(linked[u.raw]);
          return (
            <li
              key={u.raw}
              className="flex flex-col gap-2 rounded-lg border border-[var(--glass-border)] bg-[var(--surface-faint)] p-3 sm:flex-row sm:items-center sm:gap-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                  {u.raw}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {u.matches_count} partido{u.matches_count === 1 ? "" : "s"} afectado
                  {u.matches_count === 1 ? "" : "s"}
                  {u.suggested_team_name && !isLinked && (
                    <>
                      {" "}
                      · sugerencia:{" "}
                      <span className="text-[var(--accent)]">
                        {u.suggested_team_name}
                      </span>
                    </>
                  )}
                </p>
              </div>

              <AliasSelect
                key={`${u.raw}-${defaultValue}`}
                defaultValue={defaultValue}
                options={sortedCandidates}
                disabled={pending[u.raw] || isLinked}
                onSubmit={(val) => handleLink(u, val)}
                linked={isLinked}
              />

              {errors[u.raw] && (
                <p className="text-xs text-red-400 sm:basis-full">{errors[u.raw]}</p>
              )}
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}

function AliasSelect({
  defaultValue,
  options,
  disabled,
  linked,
  onSubmit,
}: {
  defaultValue: string;
  options: StandingOption[];
  disabled: boolean;
  linked: boolean;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div className="flex shrink-0 items-center gap-2 sm:w-[420px]">
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        className="min-w-0 flex-1 rounded-lg border border-[var(--glass-border)] bg-[var(--form-input-bg)] p-2 text-sm text-[var(--text-primary)] disabled:opacity-50"
      >
        <option value="">Selecciona equipo…</option>
        {options.map((o) => (
          <option key={o.normalized_name} value={o.normalized_name}>
            {o.team_name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onSubmit(value)}
        disabled={disabled || !value}
        className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-surface)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--accent-muted)] hover:text-[var(--accent)] disabled:opacity-50"
      >
        <FontAwesomeIcon icon={linked ? faCheck : faLink} className="text-xs" />
        {linked ? "Vinculado" : "Vincular"}
      </button>
    </div>
  );
}
