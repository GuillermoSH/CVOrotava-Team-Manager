"use client";

import { prettyTeamName } from "@/lib/fed/linkPlan";
import type { CompetitionStanding, CompetitionTeam } from "@/lib/competition/build";

const th = "px-2 py-2 text-xs font-semibold text-[var(--text-muted)]";
const td = "whitespace-nowrap px-2 py-2.5 text-right tabular-nums";

export default function GroupStandings({
  groupName,
  standings,
  teams,
}: Readonly<{ groupName: string; standings: CompetitionStanding[]; teams: Record<number, CompetitionTeam> }>) {
  const anyPlayed = standings.some((s) => s.played > 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[20rem] border-collapse text-sm">
        <caption className="sr-only">Clasificación de {prettyTeamName(groupName)}</caption>
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
            <th scope="col" className={`${th} hidden text-right md:table-cell`}>
              Puntos
            </th>
            <th scope="col" className={`${th} text-right`}>
              Pts
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--glass-border)]">
          {standings.map((s) => {
            const team = teams[s.teamId];
            return (
              <tr
                key={s.teamId}
                className={
                  team?.isOurs
                    ? "bg-[var(--accent-muted)] font-semibold text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)]"
                }
              >
                <td className={`${td} text-[var(--text-muted)]`}>{anyPlayed ? s.position : "–"}</td>
                <td className="px-2 py-2.5 text-left">{team ? prettyTeamName(team.name) : `Equipo ${s.teamId}`}</td>
                <td className={td}>{s.played}</td>
                <td className={`${td} hidden sm:table-cell`}>{s.won}</td>
                <td className={`${td} hidden sm:table-cell`}>{s.lost}</td>
                <td className={`${td} hidden sm:table-cell`}>
                  {s.sets_for}–{s.sets_against}
                </td>
                <td className={`${td} hidden md:table-cell`}>
                  {s.points_for}–{s.points_against}
                </td>
                <td className={`${td} font-bold text-[var(--text-primary)]`}>{s.league_points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
