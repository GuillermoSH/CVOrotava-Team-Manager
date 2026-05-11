import { normalizeTeamName } from "./normalize";

export type StandingLite = {
  position: number;
  team_name: string;
  normalized_name: string;
};

export type ResolveResult = {
  row: StandingLite | null;
  via: "direct" | "alias" | null;
  normalized: string;
};

/**
 * Resuelve un nombre de rival (matches.opponent) a una fila de league_standings.
 * Cadena: directo → alias → unmatched. Solo 1 salto (sin multi-hop) — el endpoint
 * de team-aliases bloquea cadenas al crear.
 */
export function resolveOpponent(
  rawOpponent: string,
  standingsByNorm: Map<string, StandingLite>,
  aliasesByAlias: Map<string, string>
): ResolveResult {
  const normalized = normalizeTeamName(rawOpponent);
  if (!normalized) return { row: null, via: null, normalized };

  const direct = standingsByNorm.get(normalized);
  if (direct) return { row: direct, via: "direct", normalized };

  const canonical = aliasesByAlias.get(normalized);
  if (canonical) {
    const viaAlias = standingsByNorm.get(canonical);
    if (viaAlias) return { row: viaAlias, via: "alias", normalized };
  }

  return { row: null, via: null, normalized };
}

/**
 * Tier según posición final (top/mid/bottom). Reparte por tercios.
 */
export function tierFromPosition(position: number, total: number): "top" | "mid" | "bottom" {
  if (total <= 0) return "mid";
  const third = Math.ceil(total / 3);
  if (position <= third) return "top";
  if (position > total - third) return "bottom";
  return "mid";
}

/**
 * Puntos LIGA conseguidos en un partido a partir de los sets ganados/perdidos.
 *   3-0 / 3-1 → 3 pts ganador, 0 perdedor
 *   3-2       → 2 pts ganador, 1 pt perdedor
 *   <3 sets sin ganador → 0 (partido no concluido)
 */
export function leaguePointsEarned(ourSetsWon: number, theirSetsWon: number): number {
  if (ourSetsWon < 3 && theirSetsWon < 3) return 0;
  if (ourSetsWon === 3 && theirSetsWon <= 1) return 3;
  if (ourSetsWon === 3 && theirSetsWon === 2) return 2;
  if (theirSetsWon === 3 && ourSetsWon === 2) return 1;
  return 0;
}

/**
 * Si no hay match_sets, derivamos sets ganados/perdidos del string `matches.result`
 * (formato "X-Y" donde X = nuestros sets, Y = sets rival).
 */
export function parseResultString(result: string | null | undefined): {
  ourSets: number;
  theirSets: number;
} | null {
  if (!result) return null;
  const m = /^\s*(\d+)\s*[-–:]\s*(\d+)\s*$/.exec(result);
  if (!m) return null;
  return { ourSets: Number(m[1]), theirSets: Number(m[2]) };
}
