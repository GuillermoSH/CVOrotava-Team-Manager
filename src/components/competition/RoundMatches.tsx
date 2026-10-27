"use client";

import { useState } from "react";
import { prettyTeamName } from "@/lib/fed/linkPlan";
import type { CompetitionMatch, CompetitionTeam } from "@/lib/competition/build";
import { shortDate } from "@/components/stats/competitive/format";

const STATUS_LABEL: Partial<Record<CompetitionMatch["status"], string>> = {
  postponed: "Aplazado",
  canceled: "Suspendido",
};

function teamName(teams: Record<number, CompetitionTeam>, id: number | null): string {
  return id !== null && teams[id] ? prettyTeamName(teams[id].name) : "Por determinar";
}

function MatchRow({ match, teams }: Readonly<{ match: CompetitionMatch; teams: Record<number, CompetitionTeam> }>) {
  const [showReport, setShowReport] = useState(false);
  const reportHref = `/api/fed/report/${match.id}`;
  const played = match.status === "played";
  const homeWon = played && (match.homeSets ?? 0) > (match.awaySets ?? 0);
  const awayWon = played && (match.awaySets ?? 0) > (match.homeSets ?? 0);
  const when = [match.date ? shortDate(match.date) : "Sin fecha", match.time, match.venue].filter(Boolean).join(" · ");

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

      {played && (match.sets.length > 0 || match.reportUrl) ? (
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
          <span className="tabular-nums">{match.sets.map((s) => `${s.home}-${s.away}`).join(" · ")}</span>
          {match.reportUrl ? (
            <span className="flex items-center gap-3">
              <button
                type="button"
                aria-expanded={showReport}
                onClick={() => setShowReport((v) => !v)}
                className="cursor-pointer font-semibold text-[var(--accent)] hover:underline"
              >
                {showReport ? "Ocultar acta" : "Ver acta"}
              </button>
              <a
                href={reportHref}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[var(--text-secondary)] hover:underline"
              >
                Abrir PDF
              </a>
            </span>
          ) : null}
        </div>
      ) : null}

      {showReport && match.reportUrl ? (
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
}: Readonly<{ matches: CompetitionMatch[]; teams: Record<number, CompetitionTeam> }>) {
  if (matches.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">Esta jornada todavía no tiene partidos.</p>;
  }
  return (
    <ul className="divide-y divide-[var(--glass-border)] overflow-hidden rounded-xl border border-[var(--glass-border)]">
      {matches.map((m) => (
        <MatchRow key={m.id} match={m} teams={teams} />
      ))}
    </ul>
  );
}
