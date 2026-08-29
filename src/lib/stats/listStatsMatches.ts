import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type StatsMatchRow = {
  id: string;
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
      .select("id, season, gender, result, opponent, venues(location_type)");

    if (season) query = query.eq("season", season);
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
