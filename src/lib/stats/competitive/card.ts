import type { StandingsRow } from "@/lib/fed/standings";
import { attributesFor, ATTRIBUTE_DEFS, percentile, toRating99, type Attribute, type TeamMetrics } from "./metrics";
import type { EloRun } from "./elo";

export type TeamCard = {
  season: string;
  teamId: number;
  teamName: string;
  played: number;
  wins: number;
  losses: number;
  leaguePoints: number;
  position: number | null;
  teams: number;
  /** Rating Elo (≈1500 = media de la liga); null mientras sea «limpio». */
  rating: number | null;
  /** 45–99 o null si todavía hay pocos partidos. */
  ovr: number | null;
  attributes: Attribute[];
  /** Menos de 4 partidos: la ficha se enseña con aviso. */
  provisional: boolean;
};

export const MIN_MATCHES_FOR_CARD = 4;
export const MIN_MATCHES_FOR_RATING = 3;

const RATING_WEIGHT = 0.4;

export function buildCard(input: {
  season: string;
  teamId: number;
  teamName: string;
  standings: StandingsRow[];
  metrics: Map<number, TeamMetrics>;
  elo: EloRun;
  hasPrior: boolean;
}): TeamCard {
  const { teamId, standings, metrics, elo } = input;
  const row = standings.find((r) => r.team_id === teamId) ?? null;
  const mine = metrics.get(teamId);
  const played = mine?.played ?? 0;
  const rated = played >= MIN_MATCHES_FOR_RATING || input.hasPrior;
  const rating = rated ? elo.final.get(teamId) ?? null : null;

  const allMetrics = [...metrics.values()];
  const attributes = mine
    ? attributesFor(mine, allMetrics)
    : attributesFor({ teamId, played: 0, wins: 0, setsPlayed: 0, pointsFor: 0, pointsAgainst: 0, closeSets: 0, closeSetWins: 0, lostFirstSet: 0, comebackWins: 0, homePlayed: 0, homeWins: 0, awayPlayed: 0, awayWins: 0 }, allMetrics);

  const provisional = played < MIN_MATCHES_FOR_CARD;
  let ovr: number | null = null;
  if (!provisional) {
    let sum = 0;
    let weight = 0;
    if (rating !== null) {
      const ratings = [...elo.final.entries()]
        .filter(([id]) => (elo.played.get(id) ?? 0) > 0)
        .map(([, r]) => r);
      const pct = percentile(rating, ratings);
      if (pct !== null) {
        sum += RATING_WEIGHT * toRating99(pct);
        weight += RATING_WEIGHT;
      }
    }
    for (const a of attributes) {
      if (a.value === null) continue;
      const w = ATTRIBUTE_DEFS.find((d) => d.key === a.key)!.weight;
      sum += w * a.value;
      weight += w;
    }
    ovr = weight > 0 ? Math.round(sum / weight) : null;
  }

  return {
    season: input.season,
    teamId,
    teamName: input.teamName,
    played,
    wins: mine?.wins ?? 0,
    losses: played - (mine?.wins ?? 0),
    leaguePoints: row?.league_points ?? 0,
    position: row && played > 0 ? row.position : null,
    teams: standings.length,
    rating: rating === null ? null : Math.round(rating),
    ovr,
    attributes,
    provisional,
  };
}
