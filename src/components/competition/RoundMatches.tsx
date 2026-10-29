"use client";

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { prettyTeamName } from "@/lib/fed/linkPlan";
import { groupByDay, type CompetitionMatch, type CompetitionTeam } from "@/lib/competition/build";
import { fedMatchHref } from "@/lib/competition/links";
import { longDate } from "@/components/stats/competitive/format";

type Teams = Record<number, CompetitionTeam>;

const STATUS_LABEL: Partial<Record<CompetitionMatch["status"], string>> = {
  postponed: "Aplazado",
  canceled: "Suspendido",
};

function teamName(teams: Teams, id: number | null): string {
  return id !== null && teams[id] ? prettyTeamName(teams[id].name) : "Por determinar";
}

/** Una línea del marcador: equipo, sets ganados y los puntos de cada set. */
function ScoreLine({
  name,
  won,
  sets,
  setPoints,
  played,
}: Readonly<{
  name: string;
  won: boolean;
  sets: number | null;
  setPoints: { own: number; rival: number }[];
  played: boolean;
}>) {
  return (
    <>
      <span
        className={`min-w-0 truncate text-sm ${won ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}
      >
        {name}
      </span>
      <span className="flex items-baseline justify-end gap-3 tabular-nums">
        <span className={`w-5 text-right text-base ${won ? "font-bold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
          {played ? sets : ""}
        </span>
        {/* Ancho de cinco sets: el primer set y los sets ganados caen en la misma columna en todas las filas */}
        <span className="flex w-[8.25rem] gap-2 text-xs text-[var(--text-muted)]">
          {setPoints.map((s, i) => (
            <span key={i} className={`w-5 text-right ${s.own > s.rival ? "font-semibold text-[var(--text-primary)]" : ""}`}>
              {s.own}
            </span>
          ))}
        </span>
      </span>
    </>
  );
}

function MatchRow({ match, teams }: Readonly<{ match: CompetitionMatch; teams: Teams }>) {
  const played = match.status === "played";
  const homeWon = played && (match.homeSets ?? 0) > (match.awaySets ?? 0);
  const awayWon = played && (match.awaySets ?? 0) > (match.homeSets ?? 0);

  if (match.status === "rest") {
    return (
      <li className="px-4 py-3 text-sm text-[var(--text-muted)]">
        Descansa <span className="font-medium text-[var(--text-secondary)]">{teamName(teams, match.homeId ?? match.awayId)}</span>
      </li>
    );
  }

  const homeSetPoints = match.sets.map((s) => ({ own: s.home, rival: s.away }));
  const awaySetPoints = match.sets.map((s) => ({ own: s.away, rival: s.home }));

  return (
    <li className={`border-l-[3px] ${match.ours ? "border-[var(--accent)] bg-[var(--accent-muted)]" : "border-transparent"}`}>
      <Link
        href={fedMatchHref(match.id)}
        aria-label={`${teamName(teams, match.homeId)} contra ${teamName(teams, match.awayId)}: ver el partido`}
        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-3 transition-colors hover:bg-[var(--glass-surface)]"
      >
        <span className="grid grid-cols-1 gap-y-2 md:grid-cols-[6.5rem_minmax(0,28rem)] md:items-center md:gap-x-4">
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 md:block">
            <span className="block text-sm font-semibold tabular-nums text-[var(--text-primary)]">{match.time ?? "Por fijar"}</span>
            {STATUS_LABEL[match.status] ? (
              <span className="mt-1 inline-block rounded bg-[var(--surface-faint)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)]">
                {STATUS_LABEL[match.status]}
              </span>
            ) : null}
            {match.venue ? <span className="mt-0.5 line-clamp-2 block text-xs text-[var(--text-muted)]">{match.venue}</span> : null}
          </span>

          <span className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1">
            <ScoreLine name={teamName(teams, match.homeId)} won={homeWon} sets={match.homeSets} setPoints={homeSetPoints} played={played} />
            <ScoreLine name={teamName(teams, match.awayId)} won={awayWon} sets={match.awaySets} setPoints={awaySetPoints} played={played} />
          </span>
        </span>
        <FontAwesomeIcon icon={faChevronRight} className="text-xs text-[var(--text-muted)]" aria-hidden />
      </Link>
    </li>
  );
}

export default function RoundMatches({ matches, teams }: Readonly<{ matches: CompetitionMatch[]; teams: Teams }>) {
  if (matches.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[var(--glass-border)] px-4 py-6 text-sm text-[var(--text-muted)]">
        Esta jornada todavía no tiene partidos.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {groupByDay(matches).map((day) => (
        <section key={day.date ?? "sin-fecha"} aria-label={day.date ? longDate(day.date) : "Sin fecha"}>
          <h3 className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">
            {day.date ? longDate(day.date) : "Fecha por confirmar"}
          </h3>
          <ul className="divide-y divide-[var(--glass-border)] overflow-hidden rounded-xl border border-[var(--glass-border)]">
            {day.matches.map((m) => (
              <MatchRow key={m.id} match={m} teams={teams} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
