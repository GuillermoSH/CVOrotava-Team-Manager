"use client";

import { useMemo, useState } from "react";
import { prettyTeamName } from "@/lib/fed/linkPlan";
import type { CompetitionMatch, CompetitionTeam } from "@/lib/competition/build";
import { scoutMatch } from "@/lib/competition/scout";
import { shortDate } from "@/components/stats/competitive/format";
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
  "inline-flex min-h-9 cursor-pointer items-center rounded-lg border border-[var(--glass-border)] bg-[var(--surface-faint)] px-3 font-semibold transition-colors hover:bg-[var(--glass-surface)]";

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
  const when = [match.date ? shortDate(match.date) : "Sin fecha", match.time, match.venue].filter(Boolean).join(" · ");
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
    const resting = teamName(teams, match.homeId ?? match.awayId);
    return (
      <li className="px-3 py-2.5 text-sm text-[var(--text-muted)]">
        Descansa <span className="font-medium text-[var(--text-secondary)]">{resting}</span>
      </li>
    );
  }

  const side = (id: number | null, won: boolean, align: "left" | "right") => (
    <span
      className={`min-w-0 flex-1 truncate ${align === "right" ? "text-right" : "text-left"} ${
        won ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
      }`}
    >
      {teamName(teams, id)}
    </span>
  );

  const toggle = (which: "scout" | "report") => setPanel((p) => (p === which ? null : which));

  return (
    <li className={`px-3 py-3 ${match.ours ? "bg-[var(--accent-muted)]" : ""}`}>
      <div className="mb-1.5 flex flex-wrap items-center gap-x-2 text-xs text-[var(--text-muted)]">
        <span>{when}</span>
        {STATUS_LABEL[match.status] ? (
          <span className="rounded-md bg-[var(--surface-faint)] px-1.5 py-0.5 font-semibold text-[var(--text-secondary)]">
            {STATUS_LABEL[match.status]}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-3 text-sm">
        {side(match.homeId, homeWon, "left")}
        <span
          className="w-14 shrink-0 text-center font-bold tabular-nums text-[var(--text-primary)]"
          aria-label={played ? `Resultado ${match.homeSets} a ${match.awaySets}` : "Sin jugar"}
        >
          {played ? `${match.homeSets} – ${match.awaySets}` : "vs"}
        </span>
        {side(match.awayId, awayWon, "right")}
      </div>

      {played && match.sets.length > 0 ? (
        <p className="mt-1.5 text-xs tabular-nums text-[var(--text-muted)]">
          {match.sets.map((s) => `${s.home}-${s.away}`).join(" · ")}
        </p>
      ) : null}

      {canScout || match.reportUrl ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          {canScout ? (
            <button
              type="button"
              aria-expanded={panel === "scout"}
              onClick={() => toggle("scout")}
              className={`${action} text-[var(--accent)]`}
            >
              {panel === "scout" ? "Ocultar scout" : "Scout"}
            </button>
          ) : null}
          {match.reportUrl ? (
            <>
              <button
                type="button"
                aria-expanded={panel === "report"}
                onClick={() => toggle("report")}
                className={`${action} text-[var(--accent)]`}
              >
                {panel === "report" ? "Ocultar acta" : "Ver acta"}
              </button>
              <a
                href={reportHref}
                target="_blank"
                rel="noopener noreferrer"
                className={`${action} text-[var(--text-secondary)]`}
              >
                Abrir PDF
              </a>
            </>
          ) : null}
        </div>
      ) : null}

      {panel === "scout" && scout && match.homeId !== null && match.awayId !== null ? (
        <div className="mt-3 rounded-lg border border-[var(--glass-border)] bg-[var(--color-bg-card)] p-3 sm:p-4">
          <MatchScoutPanel scout={scout} homeId={match.homeId} awayId={match.awayId} teams={teams} />
        </div>
      ) : null}

      {panel === "report" && match.reportUrl ? (
        <iframe
          src={reportHref}
          title={`Acta del partido ${teamName(teams, match.homeId)} contra ${teamName(teams, match.awayId)}`}
          loading="lazy"
          className="mt-3 h-[70vh] w-full rounded-lg border border-[var(--glass-border)] bg-[var(--surface-faint)]"
        />
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
    return <p className="text-sm text-[var(--text-muted)]">Esta jornada todavía no tiene partidos.</p>;
  }
  return (
    <ul className="divide-y divide-[var(--glass-border)] overflow-hidden rounded-xl border border-[var(--glass-border)]">
      {matches.map((m) => (
        <MatchRow key={m.id} match={m} teams={teams} groupMatches={groupMatches} />
      ))}
    </ul>
  );
}
