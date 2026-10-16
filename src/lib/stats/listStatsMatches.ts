import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeSeasonId } from "@/utils/getCurrentSeason";

export type StatsMatchRow = {
  id: string;
  /** ID del partido en la federación; null en amistosos y partidos creados a mano. */
  fed_match_id: number | null;
  season: string;
  gender: "male" | "female";
  result: string | null;
  opponent: string;
  venues?: { location_type: string } | null;
};

const listStatsMatchesCached = cache(
  async (season: string, gender: string): Promise<StatsMatchRow[]> => {
    let query = supabaseAdmin
      .from("matches")
      .select("id, fed_match_id, season, gender, result, opponent, venues(location_type)");

    if (season) query = query.eq("season", normalizeSeasonId(season));
    if (gender) query = query.eq("gender", gender);
    query = query.not("result", "is", null).neq("result", "");

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as StatsMatchRow[];
  }
);

export async function listStatsMatches(opts: {
  season?: string | null;
  gender?: string | null;
}): Promise<StatsMatchRow[]> {
  return listStatsMatchesCached(opts.season ?? "", opts.gender ?? "");
}
