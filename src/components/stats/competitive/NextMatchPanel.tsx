"use client";

import Link from "next/link";
import { prettyTeamName } from "@/lib/fed/linkPlan";
import type { CompetitiveStats } from "@/lib/stats/competitive/build";
import { FormPips, Meter, Stars, TagChip } from "./ui";
import { ordinal, percent, whenLabel } from "./format";

/** Puesto en liga: la historia principal del Resumen. */
export function PositionPanel({
  stats,
  leagueHref,
}: Readonly<{ stats: CompetitiveStats; /** Dónde está la clasificación completa: en Jornadas. */ leagueHref: string }>) {
  if (!stats.hasLeague || !stats.group) {
    return (
      <section aria-labelledby="position-title">
        <h2 id="position-title" className="mb-3 text-lg font-semibold tracking-tight sm:text-xl">
          Clasificación
        </h2>
        <p className="text-sm text-[var(--text-muted)]">
          Todavía no hay una liga con nuestro equipo en esta temporada.
        </p>
      </section>
    );
  }

  const ours = stats.standings.find((t) => t.isOurs);
  const played = ours?.played ?? 0;
  const position = ours && played > 0 ? ours.position : null;
  const points = ours?.leaguePoints ?? 0;
  const wins = ours?.wins ?? 0;
  const losses = ours?.losses ?? 0;

  return (
    <section aria-labelledby="position-title">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="position-title" className="text-lg font-semibold tracking-tight sm:text-xl">
          Clasificación
        </h2>
        <p className="text-sm text-[var(--text-muted)]">{prettyTeamName(stats.group.name)}</p>
      </div>
      {position !== null ? (
        <p className="text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">
          {ordinal(position)}
          <span className="ml-2 text-lg font-semibold text-[var(--text-secondary)] sm:text-xl">
            de {stats.group.teams}
          </span>
        </p>
      ) : (
        <p className="text-2xl font-bold tracking-tight text-[var(--text-secondary)]">Sin partidos aún</p>
      )}
      <p className="mt-2 text-sm tabular-nums text-[var(--text-secondary)]">
        {points} pts · {wins}V {losses}D
        {played > 0 ? ` · ${played} jugados` : ""}
      </p>
      <Link
        href={leagueHref}
        className="mt-3 inline-block text-sm font-semibold text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        Ver tabla completa
      </Link>
    </section>
  );
}

export function NextMatchPanel({
  stats,
  onOpenRival,
}: Readonly<{ stats: CompetitiveStats; onOpenRival: (teamId: number) => void }>) {
  const next = stats.nextMatch;

  return (
    <section aria-labelledby="next-match-title">
      <h2 id="next-match-title" className="mb-3 text-lg font-semibold tracking-tight sm:text-xl">
        Próximo partido
      </h2>
      {next ? (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm text-[var(--text-muted)]">
              {whenLabel(next.date, stats.asOf)} · {next.home ? "en casa" : "fuera"}
            </p>
            <p className="mt-0.5 text-2xl font-bold leading-tight tracking-tight">{prettyTeamName(next.rivalName)}</p>
          </div>

          {next.winProbability !== null ? (
            <div className="flex items-center gap-4">
              <p className="text-4xl font-bold tabular-nums tracking-tight">{percent(next.winProbability)}</p>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-[var(--text-muted)]">Probabilidad de ganar (estimación)</p>
                <Meter className="mt-1.5" value={next.winProbability * 100} label="Probabilidad de ganar" />
              </div>
              <div className="shrink-0 text-right">
                <p className="mb-1 text-xs text-[var(--text-muted)]">Dificultad</p>
                <Stars value={next.stars} />
              </div>
            </div>
          ) : (
            <p className="max-w-prose text-sm text-[var(--text-secondary)]">
              Es un rival sin referencia todavía: la probabilidad aparece cuando él (o nosotros) acumule 3 partidos
              esta temporada.
            </p>
          )}

          {next.rivalId !== null ? (
            <button
              type="button"
              onClick={() => onOpenRival(next.rivalId!)}
              className="self-start text-sm font-semibold text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              Ver dossier del rival
            </button>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">No hay partidos programados por ahora.</p>
      )}
    </section>
  );
}

export function FormPanel({ stats }: Readonly<{ stats: CompetitiveStats }>) {
  const { form, previousCard } = stats;
  const streak = form.streak;

  return (
    <section aria-labelledby="form-title">
      <h2 id="form-title" className="mb-3 text-lg font-semibold tracking-tight sm:text-xl">
        Forma
      </h2>
      {form.last5.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <FormPips results={form.last5} />
          {streak ? (
            <p className="text-sm text-[var(--text-secondary)]">
              Racha actual: {streak.length} {streak.type === "W" ? (streak.length === 1 ? "victoria" : "victorias") : streak.length === 1 ? "derrota" : "derrotas"}
              {form.bestWinStreak > 0 ? ` · mejor racha ${form.bestWinStreak}` : ""}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">
          Todavía no hay partidos jugados esta temporada
          {previousCard ? `. El año pasado: ${previousCard.wins}V y ${previousCard.losses}D.` : "."}
        </p>
      )}
    </section>
  );
}

export function TopRivalPanel({
  stats,
  onOpenRival,
}: Readonly<{ stats: CompetitiveStats; onOpenRival: (teamId: number) => void }>) {
  const top = stats.rivals[0];
  if (!top) return null;

  return (
    <section aria-labelledby="top-rival-title">
      <h2 id="top-rival-title" className="mb-3 text-lg font-semibold tracking-tight sm:text-xl">
        Rival a batir
      </h2>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <p className="text-xl font-bold leading-tight tracking-tight">{prettyTeamName(top.name)}</p>
        {top.tags.slice(0, 2).map((t) => (
          <TagChip key={t} tag={t} />
        ))}
      </div>
      <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{top.reason}</p>
      <button
        type="button"
        onClick={() => onOpenRival(top.teamId)}
        className="mt-3 text-sm font-semibold text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        Ver dossier y el resto de rivales
      </button>
    </section>
  );
}
