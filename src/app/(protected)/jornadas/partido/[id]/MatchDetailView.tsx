"use client";

import { useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft } from "@fortawesome/free-solid-svg-icons";
import SegmentedControl from "@/components/ui/SegmentedControl";
import MatchScoutPanel from "@/components/competition/MatchScoutPanel";
import { longDate } from "@/components/stats/competitive/format";
import { prettyTeamName } from "@/lib/fed/linkPlan";
import { groupLabel, roundTitle, type CompetitionMatch, type CompetitionTeam } from "@/lib/competition/build";
import { matchesKnownBefore, scoutMatch } from "@/lib/competition/scout";

type Teams = Record<number, CompetitionTeam>;
type Tab = "resumen" | "scout" | "video";

const STATUS_LABEL: Partial<Record<CompetitionMatch["status"], string>> = {
  postponed: "Aplazado",
  canceled: "Suspendido",
};

const name = (teams: Teams, id: number | null) => (id !== null && teams[id] ? prettyTeamName(teams[id].name) : "Por determinar");

const link =
  "inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold transition-colors max-md:min-h-11 hover:bg-[var(--glass-surface)]";

function SetsTable({ match, home, away }: Readonly<{ match: CompetitionMatch; home: string; away: string }>) {
  if (match.sets.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">El acta no trae los puntos de cada set.</p>;
  }
  const totalHome = match.sets.reduce((a, s) => a + s.home, 0);
  const totalAway = match.sets.reduce((a, s) => a + s.away, 0);
  const th = "px-3 py-2 text-xs font-medium text-[var(--text-muted)]";
  const td = "px-3 py-2.5 text-right tabular-nums";
  return (
    <div className="max-w-xl overflow-x-auto rounded-xl border border-[var(--glass-border)]">
      <table className="w-full min-w-[18rem] border-collapse text-sm">
        <caption className="sr-only">Puntos de cada set</caption>
        <thead>
          <tr className="border-b border-[var(--glass-border)]">
            <th scope="col" className={`${th} text-left`}>
              Set
            </th>
            <th scope="col" className={`${th} text-right`}>
              {home}
            </th>
            <th scope="col" className={`${th} text-right`}>
              {away}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--glass-border)]">
          {match.sets.map((s, i) => (
            <tr key={i}>
              <td className="px-3 py-2.5 text-[var(--text-secondary)]">{i + 1}</td>
              <td className={`${td} ${s.home > s.away ? "font-bold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>{s.home}</td>
              <td className={`${td} ${s.away > s.home ? "font-bold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>{s.away}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-[var(--glass-border)] text-[var(--text-muted)]">
            <th scope="row" className="px-3 py-2.5 text-left text-xs font-medium">
              Total de puntos
            </th>
            <td className={td}>{totalHome}</td>
            <td className={td}>{totalAway}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function MatchDetailView({
  match,
  teams,
  groupMatches,
  groupName,
  roundLabel,
  backHref,
  ours,
  isAdmin,
}: Readonly<{
  match: CompetitionMatch;
  teams: Teams;
  groupMatches: CompetitionMatch[];
  groupName: string;
  roundLabel: string;
  backHref: string;
  ours: { id: string; video_url: string | null; notes: string | null } | null;
  isAdmin: boolean;
}>) {
  const played = match.status === "played";
  const home = name(teams, match.homeId);
  const away = name(teams, match.awayId);
  const hasVideo = Boolean(ours?.video_url);
  const [tab, setTab] = useState<Tab>(played ? "resumen" : "scout");

  const canScout = match.homeId !== null && match.awayId !== null;
  const scout = tab === "scout" && canScout ? scoutMatch(matchesKnownBefore(match, groupMatches), match.homeId!, match.awayId!) : null;

  const when = [match.date ? longDate(match.date) : "Fecha por confirmar", match.time, match.venue].filter(Boolean).join(" · ");
  const options: { value: Tab; label: string }[] = [
    { value: "resumen", label: "Resumen" },
    ...(canScout ? [{ value: "scout" as const, label: "Scout" }] : []),
    ...(hasVideo ? [{ value: "video" as const, label: "Vídeo" }] : []),
  ];

  return (
    <div className="w-full max-w-[56rem]">
      <Link
        href={backHref}
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] max-md:min-h-11"
      >
        <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
        {roundTitle(roundLabel)} · {groupLabel(groupName)}
      </Link>

      <header className="mb-6">
        <h1 className="sr-only">
          {home} contra {away}
        </h1>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-4 sm:gap-x-8">
          <p className={`text-right text-lg leading-tight sm:text-2xl ${played && (match.homeSets ?? 0) > (match.awaySets ?? 0) ? "font-bold" : "font-medium text-[var(--text-secondary)]"}`}>{home}</p>
          <p className="text-center text-3xl font-bold tabular-nums sm:text-4xl" aria-label={played ? `Resultado ${match.homeSets} a ${match.awaySets}` : "Sin jugar"}>
            {played ? `${match.homeSets} – ${match.awaySets}` : "vs"}
          </p>
          <p className={`text-left text-lg leading-tight sm:text-2xl ${played && (match.awaySets ?? 0) > (match.homeSets ?? 0) ? "font-bold" : "font-medium text-[var(--text-secondary)]"}`}>{away}</p>
        </div>
        <p className="mt-3 text-center text-sm text-[var(--text-muted)]">
          {when}
          {STATUS_LABEL[match.status] ? (
            <span className="ml-2 rounded bg-[var(--surface-faint)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)]">
              {STATUS_LABEL[match.status]}
            </span>
          ) : null}
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
          {ours && isAdmin ? (
            <Link href={`/matches/${ours.id}?edit=1`} className={`${link} text-[var(--accent)]`}>
              Editar partido
            </Link>
          ) : null}
          {match.reportUrl ? (
            <a href={`/api/fed/report/${match.id}`} target="_blank" rel="noopener noreferrer" className={`${link} text-[var(--text-secondary)]`}>
              Acta en PDF
            </a>
          ) : null}
        </div>
      </header>

      {options.length > 1 ? (
        <SegmentedControl aria-label="Secciones del partido" value={tab} options={options} onChange={setTab} className="mb-6" />
      ) : null}

      {tab === "resumen" ? (
        <div className="flex flex-col gap-6">
          {played ? (
            <section aria-labelledby="sets-title">
              <h2 id="sets-title" className="mb-3 text-lg font-semibold tracking-tight">
                Sets
              </h2>
              <SetsTable match={match} home={home} away={away} />
            </section>
          ) : (
            <p className="rounded-xl border border-dashed border-[var(--glass-border)] px-4 py-6 text-sm text-[var(--text-muted)]">
              Todavía no se ha jugado. En «Scout» tienes cómo llegan los dos equipos.
            </p>
          )}
          {ours?.notes ? (
            <section aria-labelledby="notes-title">
              <h2 id="notes-title" className="mb-2 text-lg font-semibold tracking-tight">
                Notas del club
              </h2>
              <p className="whitespace-pre-line text-sm text-[var(--text-secondary)]">{ours.notes}</p>
            </section>
          ) : null}
        </div>
      ) : null}

      {tab === "scout" && scout && match.homeId !== null && match.awayId !== null ? (
        <div className="max-w-2xl">
          <MatchScoutPanel scout={scout} homeId={match.homeId} awayId={match.awayId} teams={teams} />
        </div>
      ) : null}

      {tab === "video" && ours?.video_url ? (
        <a
          href={ours.video_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center rounded-lg border border-[var(--glass-border)] bg-[var(--surface-faint)] px-4 text-sm font-semibold text-[var(--accent)] hover:bg-[var(--glass-surface)]"
        >
          Ver el vídeo del partido
        </a>
      ) : null}
    </div>
  );
}
