"use client";

import { prettyTeamName } from "@/lib/fed/linkPlan";
import type { CompetitionStanding, CompetitionTeam } from "@/lib/competition/build";

const th = "whitespace-nowrap px-2 py-2 text-xs font-medium text-[var(--text-muted)]";
const td = "whitespace-nowrap px-2 py-2.5 text-right tabular-nums";

export default function GroupStandings({
  groupName,
  standings,
  teams,
}: Readonly<{ groupName: string; standings: CompetitionStanding[]; teams: Record<number, CompetitionTeam> }>) {
  const anyPlayed = standings.some((s) => s.played > 0);

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--glass-border)]">
      <table className="w-full min-w-[22rem] border-collapse text-sm">
        <caption className="sr-only">Clasificación de {prettyTeamName(groupName)}</caption>
        <thead>
          <tr className="border-b border-[var(--glass-border)]">
            <th scope="col" className={`${th} w-9 pl-4 text-right`}>
              #
            </th>
            <th scope="col" className={`${th} text-left`}>
              Equipo
            </th>
            <th scope="col" className={`${th} text-right`}>
              PJ
            </th>
            <th scope="col" className={`${th} text-right`}>
              V
            </th>
            <th scope="col" className={`${th} text-right`}>
              D
            </th>
            <th scope="col" className={`${th} text-right`}>
              Sets
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
                    ? "bg-[var(--accent-muted)] font-semibold text-[var(--text-primary)] shadow-[inset_3px_0_0_var(--accent)]"
                    : "text-[var(--text-secondary)]"
                }
              >
                <td className={`${td} pl-4 text-[var(--text-muted)]`}>{anyPlayed ? s.position : "–"}</td>
                <td className="max-w-[13rem] truncate px-2 py-2.5 text-left">
                  {team ? prettyTeamName(team.name) : `Equipo ${s.teamId}`}
                </td>
                <td className={td}>{s.played}</td>
                <td className={td}>{s.won}</td>
                <td className={td}>{s.lost}</td>
                <td className={td}>
                  {s.sets_for}–{s.sets_against}
                </td>
                <td className={`${td} pr-4 font-bold text-[var(--text-primary)]`}>{s.league_points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
