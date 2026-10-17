/**
 * Clasificación de un grupo calculada desde los partidos sincronizados.
 * La API solo da la clasificación "de ahora"; calcularla nosotros permite
 * obtenerla en cualquier jornada y en temporadas pasadas.
 *
 * Desempate (criterio RFEVB habitual): puntos → victorias → cociente de sets
 * → cociente de puntos. Validado contra `groups/{id}/standings` de Leverade.
 */

export type StandingsMatch = {
  home_team_id: number | null;
  away_team_id: number | null;
  finished: boolean;
  home_sets: number | null;
  away_sets: number | null;
  home_league_points: number | null;
  away_league_points: number | null;
  /** Puntos totales del partido (suma de sets); null si no hay sets. */
  home_points?: number | null;
  away_points?: number | null;
};

export type StandingsRow = {
  team_id: number;
  position: number;
  played: number;
  won: number;
  lost: number;
  league_points: number;
  sets_for: number;
  sets_against: number;
  points_for: number;
  points_against: number;
};

/** Puntos de liga por resultado cuando el acta no los trae: 3-0/3-1 → 3/0, 3-2 → 2/1. */
export function leaguePointsFor(ownSets: number, rivalSets: number): number {
  if (ownSets === 3) return rivalSets === 2 ? 2 : 3;
  if (rivalSets === 3) return ownSets === 2 ? 1 : 0;
  return 0;
}

const quotient = (a: number, b: number) => (b === 0 ? (a === 0 ? 0 : Infinity) : a / b);

export function computeStandings(
  teamIds: number[],
  matches: StandingsMatch[]
): StandingsRow[] {
  const rows = new Map<number, Omit<StandingsRow, "position">>();
  const row = (id: number) => {
    let r = rows.get(id);
    if (!r) {
      r = {
        team_id: id,
        played: 0,
        won: 0,
        lost: 0,
        league_points: 0,
        sets_for: 0,
        sets_against: 0,
        points_for: 0,
        points_against: 0,
      };
      rows.set(id, r);
    }
    return r;
  };
  for (const id of teamIds) row(id);

  for (const m of matches) {
    if (!m.finished || m.home_team_id === null || m.away_team_id === null) continue;
    if (m.home_sets === null || m.away_sets === null) continue;

    const sides = [
      [m.home_team_id, m.home_sets, m.away_sets, m.home_league_points, m.home_points, m.away_points],
      [m.away_team_id, m.away_sets, m.home_sets, m.away_league_points, m.away_points, m.home_points],
    ] as const;

    for (const [id, own, rival, pts, pFor, pAgainst] of sides) {
      const r = row(id);
      r.played++;
      if (own > rival) r.won++;
      else r.lost++;
      r.league_points += pts ?? leaguePointsFor(own, rival);
      r.sets_for += own;
      r.sets_against += rival;
      r.points_for += pFor ?? 0;
      r.points_against += pAgainst ?? 0;
    }
  }

  return [...rows.values()]
    .sort(
      (a, b) =>
        b.league_points - a.league_points ||
        b.won - a.won ||
        quotient(b.sets_for, b.sets_against) - quotient(a.sets_for, a.sets_against) ||
        quotient(b.points_for, b.points_against) - quotient(a.points_for, a.points_against) ||
        a.team_id - b.team_id
    )
    .map((r, i) => ({ ...r, position: i + 1 }));
}
