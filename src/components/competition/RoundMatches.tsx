"use client";

import { useMemo, useState } from "react";
import { prettyTeamName } from "@/lib/fed/linkPlan";
import { groupByDay, type CompetitionMatch, type CompetitionTeam } from "@/lib/competition/build";
import { scoutMatch } from "@/lib/competition/scout";
import { longDate } from "@/components/stats/competitive/format";
import MatchScoutPanel from "./MatchScoutPanel";

type Teams = Record<number, CompetitionTeam>;

const STATUS_LABEL: Partial<Record<CompetitionMatch["status"], string>> = {
  postponed: "Aplazado",
  canceled: "Suspendido",
};

function teamName(teams: Teams, id: number | null): string {
  return id !== null && teams[id] ? prettyTeamName(teams[id].name) : "Por determinar";
}

/**
 * Partidos que se conocían antes de este: en uno ya jugado, solo los anteriores
 * (así el scout enseña lo que se sabía antes del partido); en uno pendiente, todos.
 */
function knownBefore(match: CompetitionMatch, all: CompetitionMatch[]): CompetitionMatch[] {
  if (match.status !== "played") return all;
  return all.filter((m) => (m.date !== null && match.date !== null ? m.date < match.date : m.id !== match.id));
}

const action =
  "inline-flex h-8 cursor-pointer items-center rounded-lg px-3 text-xs font-semibold transition-colors max-md:min-h-11 hover:bg-[var(--glass-surface)]";

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

function MatchRow({
  match,
  teams,
  groupMatches,
}: Readonly<{ match: CompetitionMatch; teams: Teams; groupMatches: CompetitionMatch[] }>) {
  const [panel, setPanel] = useState<"scout" | "report" | null>(null);
  const reportHref = `/api/fed/report/${match.id}`;
  const played = match.status === "played";
  const homeWon = played && (match.homeSets ?? 0) > (match.awaySets ?? 0);
  const awayWon = played && (match.awaySets ?? 0) > (match.homeSets ?? 0);
  const canScout = match.homeId !== null && match.awayId !== null && match.status !== "canceled";

  // Solo se calcula al abrirlo.
  const scout = useMemo(
    () =>
      panel === "scout" && match.homeId !== null && match.awayId !== null
        ? scoutMatch(knownBefore(match, groupMatches), match.homeId, match.awayId)
        : null,
    [panel, match, groupMatches]
  );

  if (match.status === "rest") {
    return (
      <li className="px-4 py-3 text-sm text-[var(--text-muted)]">
        Descansa <span className="font-medium text-[var(--text-secondary)]">{teamName(teams, match.homeId ?? match.awayId)}</span>
      </li>
    );
  }

  const toggle = (which: "scout" | "report") => setPanel((p) => (p === which ? null : which));
  const homeSetPoints = match.sets.map((s) => ({ own: s.home, rival: s.away }));
  const awaySetPoints = match.sets.map((s) => ({ own: s.away, rival: s.home }));

  return (
    <li
      className={`border-l-[3px] ${match.ours ? "border-[var(--accent)] bg-[var(--accent-muted)]" : "border-transparent"} ${
        panel && !match.ours ? "bg-[var(--surface-faint)]" : ""
      }`}
    >
      <div className="grid grid-cols-1 gap-y-2 px-4 py-3 md:grid-cols-[6.5rem_minmax(0,28rem)_auto] md:items-center md:gap-x-4">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 md:block">
          <p className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">{match.time ?? "Por fijar"}</p>
          {STATUS_LABEL[match.status] ? (
            <p className="mt-1 inline-block rounded bg-[var(--surface-faint)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)]">
              {STATUS_LABEL[match.status]}
            </p>
          ) : null}
          {match.venue ? <p className="mt-0.5 line-clamp-2 text-xs text-[var(--text-muted)]">{match.venue}</p> : null}
        </div>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1">
          <ScoreLine name={teamName(teams, match.homeId)} won={homeWon} sets={match.homeSets} setPoints={homeSetPoints} played={played} />
          <ScoreLine name={teamName(teams, match.awayId)} won={awayWon} sets={match.awaySets} setPoints={awaySetPoints} played={played} />
        </div>

        {canScout || match.reportUrl ? (
          <div className="flex items-center gap-1 md:justify-end">
            {canScout ? (
              <button
                type="button"
                aria-expanded={panel === "scout"}
                onClick={() => toggle("scout")}
                className={`${action} ${panel === "scout" ? "bg-[var(--glass-surface)] text-[var(--text-primary)]" : "text-[var(--accent)]"}`}
              >
                Scout
              </button>
            ) : null}
            {match.reportUrl ? (
              <button
                type="button"
                aria-expanded={panel === "report"}
                onClick={() => toggle("report")}
                className={`${action} ${panel === "report" ? "bg-[var(--glass-surface)] text-[var(--text-primary)]" : "text-[var(--accent)]"}`}
              >
                Acta
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {panel === "scout" && scout && match.homeId !== null && match.awayId !== null ? (
        <div className="border-t border-[var(--glass-border)] px-4 py-4">
          <MatchScoutPanel scout={scout} homeId={match.homeId} awayId={match.awayId} teams={teams} />
        </div>
      ) : null}

      {panel === "report" && match.reportUrl ? (
        <div className="border-t border-[var(--glass-border)] px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
            <span>Acta del partido</span>
            <a href={reportHref} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--accent)] hover:underline">
              Abrir en otra pestaña
            </a>
          </div>
          <iframe
            src={reportHref}
            title={`Acta del partido ${teamName(teams, match.homeId)} contra ${teamName(teams, match.awayId)}`}
            loading="lazy"
            className="h-[70vh] w-full rounded-lg border border-[var(--glass-border)] bg-[var(--surface-faint)]"
          />
        </div>
      ) : null}
    </li>
  );
}

export default function RoundMatches({
  matches,
  teams,
  groupMatches,
}: Readonly<{ matches: CompetitionMatch[]; teams: Teams; groupMatches: CompetitionMatch[] }>) {
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
              <MatchRow key={m.id} match={m} teams={teams} groupMatches={groupMatches} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
