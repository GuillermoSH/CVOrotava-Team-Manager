import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type ListMatchesOpts = {
  gender?: string | null;
  season?: string | null;
  order?: "asc" | "desc";
  limit?: number | null;
  hasResult?: boolean;
  withoutVideo?: boolean;
  forMatchId?: string | null;
  opponent?: string | null;
};

const MATCH_LIST_SELECT =
  "*, venues(id, venue_name, location_type, location_url), match_sets(id, set_number, team_score, opponent_score)";

const listMatchesCached = cache(
  async (
    gender: string,
    season: string,
    order: string,
    limit: number,
    hasResult: string,
    withoutVideo: string,
    forMatchId: string,
    opponent: string
  ) => {
    const ascending = order === "asc";

    let query = supabaseAdmin
      .from("matches")
      .select(MATCH_LIST_SELECT)
      .order("date", { ascending })
      .order("time", { ascending });

    if (season) query = query.eq("season", season);
    if (gender) query = query.eq("gender", gender);
    if (limit) query = query.limit(limit);
    if (hasResult === "1")
      query = query.not("result", "is", null).neq("result", "");

    if (withoutVideo === "1") {
      if (forMatchId) {
        query = query.or(`video_url.is.null,id.eq.${forMatchId}`);
      } else {
        query = query.is("video_url", null);
      }
    }

    if (opponent) {
      query = query.ilike("opponent", `%${opponent}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  }
);

export async function listMatches(opts: ListMatchesOpts = {}) {
  return listMatchesCached(
    opts.gender ?? "",
    opts.season ?? "",
    opts.order ?? "desc",
    opts.limit ?? 0,
    opts.hasResult ? "1" : "0",
    opts.withoutVideo ? "1" : "0",
    opts.forMatchId ?? "",
    opts.opponent ?? ""
  );
}
