import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAllowedUser } from "@/lib/auth/require-allowed-user";
import {
  StandingLite,
  resolveOpponent,
  tierFromPosition,
  leaguePointsEarned,
  parseResultString,
} from "@/lib/standings/resolveOpponent";
import { normalizeTeamName, suggestClosest } from "@/lib/standings/normalize";

type Tier = "top" | "mid" | "bottom";

type TierAgg = {
  played: number;
  won: number;
  lost: number;
  sets_for: number;
  sets_against: number;
  league_points: number;
  max_possible_points: number;
};

type MatchSetRow = { team_score: number; opponent_score: number };
type MatchRow = {
  id: string;
  date: string;
  opponent: string;
  result: string | null;
  match_sets: MatchSetRow[] | null;
};

type PerOpponent = {
  match_id: string;
  date: string;
  opponent_raw: string;
  resolved_via: "direct" | "alias" | null;
  team_name: string | null;
  /** Clave canónica en `league_standings` cuando el rival está resuelto. */
  normalized_name: string | null;
  position: number | null;
  tier: Tier | null;
  our_sets: number;
  their_sets: number;
  league_points_earned: number;
};

type RivalAgg = {
  team_name: string;
  normalized_name: string;
  position: number;
  tier: Tier;
  our_wins: number;
  our_losses: number;
  /** Derrota más contundente (mayor diferencia a favor del rival); desempate por fecha. */
  worst_loss: { our_sets: number; their_sets: number; date: string } | null;
};

type NextSeasonBucket = {
  team_name: string;
  position: number;
  tier: Tier;
  our_wins: number;
  our_losses: number;
  summary: string;
  worst_loss_sets: string | null;
};

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const auth = await requireAllowedUser(supabase);
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  const season = searchParams.get("season");
  const gender = searchParams.get("gender");

  if (!season || !gender) {
    return NextResponse.json(
      { error: "Parámetros `season` y `gender` son obligatorios." },
      { status: 400 }
    );
  }

  // 1. Standings de la temporada+género
  const { data: standings, error: stErr } = await supabaseAdmin
    .from("league_standings")
    .select("position, team_name, normalized_name, is_our_team")
    .eq("season", season)
    .eq("gender", gender)
    .order("position", { ascending: true });

  if (stErr) return NextResponse.json({ error: stErr.message }, { status: 500 });

  const emptyNextSeason = { tough: [] as NextSeasonBucket[], easy: [] as NextSeasonBucket[], upset_losses: [] as NextSeasonBucket[] };

  if (!standings || standings.length === 0) {
    return NextResponse.json({
      has_standings: false,
      season,
      gender,
      tiers: null,
      per_opponent: [],
      unmatched_opponents: [],
      total_teams: 0,
      our_position: null,
      next_season: emptyNextSeason,
      highlights: null,
    });
  }

  const ourTeamRows = standings.filter((s) => s.is_our_team);
  const ourPosition =
    ourTeamRows.length === 1 ? ourTeamRows[0].position : null;

  // Filtrar nuestra propia fila para construir el lookup (no resolvemos contra nosotros).
  const standingsByNorm = new Map<string, StandingLite>();
  for (const s of standings) {
    if (s.is_our_team) continue;
    standingsByNorm.set(s.normalized_name, {
      position: s.position,
      team_name: s.team_name,
      normalized_name: s.normalized_name,
    });
  }
  const totalTeams = standings.length;

  // 2. Aliases (global)
  const { data: aliases } = await supabaseAdmin
    .from("team_aliases")
    .select("alias_normalized, canonical_normalized");

  const aliasesByAlias = new Map<string, string>();
  for (const a of aliases ?? []) {
    aliasesByAlias.set(a.alias_normalized, a.canonical_normalized);
  }

  // 3. Matches con resultado de esa temporada+género
  const { data: matches, error: mErr } = await supabaseAdmin
    .from("matches")
    .select(
      "id, date, opponent, result, match_sets(team_score, opponent_score)"
    )
    .eq("season", season)
    .eq("gender", gender)
    .not("result", "is", null)
    .neq("result", "")
    .order("date", { ascending: true });

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  const tiers: Record<Tier, TierAgg> = {
    top: emptyAgg(),
    mid: emptyAgg(),
    bottom: emptyAgg(),
  };

  const perOpponent: PerOpponent[] = [];
  const unmatchedCount = new Map<string, { raw: string; normalized: string; count: number }>();

  for (const m of (matches ?? []) as MatchRow[]) {
    const sets = m.match_sets ?? [];
    let ourSetsWon = 0;
    let theirSetsWon = 0;
    let setsForPts = 0;
    let setsAgainstPts = 0;

    if (sets.length > 0) {
      for (const s of sets) {
        if (s.team_score > s.opponent_score) ourSetsWon++;
        else if (s.team_score < s.opponent_score) theirSetsWon++;
        setsForPts += s.team_score;
        setsAgainstPts += s.opponent_score;
      }
    } else {
      const fromStr = parseResultString(m.result);
      if (fromStr) {
        ourSetsWon = fromStr.ourSets;
        theirSetsWon = fromStr.theirSets;
      }
    }

    const pointsEarned = leaguePointsEarned(ourSetsWon, theirSetsWon);
    const resolved = resolveOpponent(m.opponent, standingsByNorm, aliasesByAlias);

    if (!resolved.row) {
      const key = resolved.normalized || m.opponent;
      const entry = unmatchedCount.get(key) ?? {
        raw: m.opponent,
        normalized: resolved.normalized,
        count: 0,
      };
      entry.count++;
      unmatchedCount.set(key, entry);
      perOpponent.push({
        match_id: m.id,
        date: m.date,
        opponent_raw: m.opponent,
        resolved_via: null,
        team_name: null,
        normalized_name: null,
        position: null,
        tier: null,
        our_sets: ourSetsWon,
        their_sets: theirSetsWon,
        league_points_earned: pointsEarned,
      });
      continue;
    }

    const tier = tierFromPosition(resolved.row.position, totalTeams);
    const agg = tiers[tier];
    agg.played++;
    if (ourSetsWon > theirSetsWon) agg.won++;
    else if (ourSetsWon < theirSetsWon) agg.lost++;
    agg.sets_for += ourSetsWon;
    agg.sets_against += theirSetsWon;
    agg.league_points += pointsEarned;
    agg.max_possible_points += 3;
    void setsForPts;
    void setsAgainstPts;

    perOpponent.push({
      match_id: m.id,
      date: m.date,
      opponent_raw: m.opponent,
      resolved_via: resolved.via,
      team_name: resolved.row.team_name,
      normalized_name: resolved.row.normalized_name,
      position: resolved.row.position,
      tier,
      our_sets: ourSetsWon,
      their_sets: theirSetsWon,
      league_points_earned: pointsEarned,
    });
  }

  // Sugerencias Levenshtein para unmatched
  const candidateNorms = Array.from(standingsByNorm.keys());
  const unmatchedOpponents = Array.from(unmatchedCount.values()).map((u) => {
    const suggestion = suggestClosest(u.normalized, candidateNorms, 3);
    const suggested = suggestion
      ? standingsByNorm.get(suggestion.match)?.team_name ?? null
      : null;
    return {
      raw: u.raw,
      normalized: u.normalized,
      matches_count: u.count,
      suggested_canonical: suggestion?.match ?? null,
      suggested_team_name: suggested,
      suggested_distance: suggestion?.distance ?? null,
    };
  });

  // Highlights: mejor victoria vs tabla + peor derrota vs tabla (una fila cada una)
  const ourSeasonResults = perOpponent.filter((p) => p.position !== null);
  const wins = ourSeasonResults.filter((p) => p.our_sets > p.their_sets);
  const losses = ourSeasonResults.filter((p) => p.our_sets < p.their_sets);

  const bestSurprise = wins.length
    ? wins.reduce((a, b) => (a.position! < b.position! ? a : b))
    : null;
  const worstUpset = losses.length
    ? losses.reduce((a, b) => (a.position! > b.position! ? a : b))
    : null;

  const rivalAggs = aggregateByRival(perOpponent);
  const nextSeason = buildNextSeasonBuckets(rivalAggs, ourPosition);

  void normalizeTeamName; // reservado para futuras métricas

  return NextResponse.json({
    has_standings: true,
    season,
    gender,
    total_teams: totalTeams,
    our_position: ourPosition,
    tiers,
    per_opponent: perOpponent.sort((a, b) => (a.date < b.date ? -1 : 1)),
    unmatched_opponents: unmatchedOpponents,
    next_season: nextSeason,
    highlights: {
      best_surprise: bestSurprise,
      worst_upset: worstUpset,
    },
  });
}

function aggregateByRival(rows: PerOpponent[]): Map<string, RivalAgg> {
  const map = new Map<string, RivalAgg>();
  for (const p of rows) {
    if (p.normalized_name === null || p.position === null || p.tier === null || !p.team_name) {
      continue;
    }
    const won = p.our_sets > p.their_sets;
    const lost = p.our_sets < p.their_sets;
    let agg = map.get(p.normalized_name);
    if (!agg) {
      agg = {
        team_name: p.team_name,
        normalized_name: p.normalized_name,
        position: p.position,
        tier: p.tier,
        our_wins: 0,
        our_losses: 0,
        worst_loss: null,
      };
      map.set(p.normalized_name, agg);
    }
    if (won) agg.our_wins++;
    if (lost) {
      agg.our_losses++;
      const margin = p.their_sets - p.our_sets;
      const prev = agg.worst_loss;
      const prevMargin = prev ? prev.their_sets - prev.our_sets : -1;
      if (!prev || margin > prevMargin || (margin === prevMargin && p.date > prev.date)) {
        agg.worst_loss = {
          our_sets: p.our_sets,
          their_sets: p.their_sets,
          date: p.date,
        };
      }
    }
  }
  return map;
}

function buildNextSeasonBuckets(
  byRival: Map<string, RivalAgg>,
  ourPosition: number | null
): { tough: NextSeasonBucket[]; easy: NextSeasonBucket[]; upset_losses: NextSeasonBucket[] } {
  const toBucket = (a: RivalAgg): NextSeasonBucket => ({
    team_name: a.team_name,
    position: a.position,
    tier: a.tier,
    our_wins: a.our_wins,
    our_losses: a.our_losses,
    summary: `${a.our_wins}V–${a.our_losses}D`,
    worst_loss_sets: a.worst_loss ? `${a.worst_loss.our_sets}–${a.worst_loss.their_sets}` : null,
  });

  const all = Array.from(byRival.values());

  const tough = all
    .filter((a) => a.tier === "top" && a.our_losses > 0)
    .sort((a, b) => a.position - b.position)
    .map(toBucket);

  const easy = all
    .filter((a) => a.tier === "bottom" && a.our_wins > 0)
    .sort((a, b) => b.position - a.position)
    .map(toBucket);

  const upset_losses =
    ourPosition === null
      ? []
      : all
          .filter((a) => a.our_losses > 0 && a.position > ourPosition)
          .sort((a, b) => {
            const gapA = a.position - ourPosition;
            const gapB = b.position - ourPosition;
            if (gapB !== gapA) return gapB - gapA;
            return b.position - a.position;
          })
          .map(toBucket);

  return { tough, easy, upset_losses };
}

function emptyAgg(): TierAgg {
  return {
    played: 0,
    won: 0,
    lost: 0,
    sets_for: 0,
    sets_against: 0,
    league_points: 0,
    max_possible_points: 0,
  };
}
