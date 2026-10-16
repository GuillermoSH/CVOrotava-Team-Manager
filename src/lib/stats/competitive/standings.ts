import { computeStandings, type StandingsRow } from "@/lib/fed/standings";
import { isPlayed, type CompMatch } from "./types";

/** Clasificación de un conjunto de partidos (con puntos de set cuando el acta los trae). */
export function standingsOf(teamIds: number[], matches: CompMatch[]): StandingsRow[] {
  return computeStandings(
    teamIds,
    matches.map((m) => ({
      home_team_id: m.homeId,
      away_team_id: m.awayId,
      finished: isPlayed(m),
      home_sets: m.homeSets,
      away_sets: m.awaySets,
      home_league_points: null,
      away_league_points: null,
      home_points: m.sets.length ? m.sets.reduce((a, s) => a + s.home, 0) : null,
      away_points: m.sets.length ? m.sets.reduce((a, s) => a + s.away, 0) : null,
    }))
  );
}

export const teamIdsOf = (matches: CompMatch[]): number[] => [
  ...new Set(matches.flatMap((m) => [m.homeId, m.awayId])),
];

/** Puesto de cada equipo tras cada jornada del grupo (la «carrera» de posiciones). */
export function positionsByRound(matches: CompMatch[]): {
  round: number;
  label: string | null;
  positions: Record<number, number>;
}[] {
  const ids = teamIdsOf(matches);
  const rounds = [...new Set(matches.filter(isPlayed).map((m) => m.roundIndex).filter((r): r is number => r !== null))].sort(
    (a, b) => a - b
  );
  return rounds.map((round) => {
    const upTo = matches.filter((m) => m.roundIndex !== null && m.roundIndex <= round);
    const positions: Record<number, number> = {};
    for (const row of standingsOf(ids, upTo)) positions[row.team_id] = row.position;
    return {
      round,
      label: matches.find((m) => m.roundIndex === round)?.roundLabel ?? null,
      positions,
    };
  });
}
