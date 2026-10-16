"use client";

import { prettyTeamName } from "@/lib/fed/linkPlan";
import type { CompetitiveStats } from "@/lib/stats/competitive/build";
import PositionRace from "./PositionRace";

const th = "px-2 py-2 text-xs font-semibold text-[var(--text-muted)]";
const td = "px-2 py-2.5 text-right tabular-nums";

export default function LeaguePanel({ stats }: Readonly<{ stats: CompetitiveStats }>) {
  if (!stats.hasLeague || !stats.group) {
    return (
      <section>
        <h2 className="mb-2 text-lg font-semibold tracking-tight sm:text-xl">Clasificación</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Todavía no hay una liga con nuestro equipo en esta temporada.
        </p>
      </section>
    );
  }

  const anyPlayed = stats.standings.some((t) => t.played > 0);

  return (
    <div className="flex flex-col gap-12">
      <section aria-labelledby="standings-title">
        <h2 id="standings-title" className="text-lg font-semibold tracking-tight sm:text-xl">
          Clasificación
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {prettyTeamName(stats.group.name)} · {stats.group.teams} equipos
          {anyPlayed ? "" : " · todavía sin partidos jugados"}
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[20rem] border-collapse text-sm">
            <caption className="sr-only">Clasificación de {prettyTeamName(stats.group.name)}</caption>
            <thead>
              <tr className="border-b border-[var(--glass-border)]">
                <th scope="col" className={`${th} w-8 text-right`}>
                  #
                </th>
                <th scope="col" className={`${th} text-left`}>
                  Equipo
                </th>
                <th scope="col" className={`${th} text-right`}>
                  PJ
                </th>
                <th scope="col" className={`${th} hidden text-right sm:table-cell`}>
                  V
                </th>
                <th scope="col" className={`${th} hidden text-right sm:table-cell`}>
                  D
                </th>
                <th scope="col" className={`${th} hidden text-right sm:table-cell`}>
                  Sets
                </th>
                <th scope="col" className={`${th} text-right`}>
                  Pts
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--glass-border)]">
              {stats.standings.map((t) => (
                <tr
                  key={t.teamId}
                  className={t.isOurs ? "bg-[var(--accent-muted)] font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}
                >
                  <td className={`${td} text-[var(--text-muted)]`}>{t.played > 0 ? t.position : "–"}</td>
                  <td className="px-2 py-2.5 text-left">{prettyTeamName(t.name)}</td>
                  <td className={td}>{t.played}</td>
                  <td className={`${td} hidden sm:table-cell`}>{t.wins}</td>
                  <td className={`${td} hidden sm:table-cell`}>{t.losses}</td>
                  <td className={`${td} hidden sm:table-cell`}>
                    {t.setsFor}–{t.setsAgainst}
                  </td>
                  <td className={`${td} font-bold text-[var(--text-primary)]`}>{t.leaguePoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="race-title">
        <h2 id="race-title" className="mb-4 text-lg font-semibold tracking-tight sm:text-xl">
          Carrera de posiciones
        </h2>
        {stats.positionsByRound.length > 0 ? (
          <PositionRace stats={stats} />
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            Aparece cuando se juegue la primera jornada de la liga.
          </p>
        )}
      </section>
    </div>
  );
}
