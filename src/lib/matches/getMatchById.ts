import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase/admin";

const MATCH_DETAIL_SELECT = `
  id,
  date,
  time,
  opponent,
  season,
  result,
  video_url,
  notes,
  gender,
  venue_id,
  venues (
    id,
    venue_name,
    location_url,
    location_type
  ),
  match_sets (
    id,
    set_number,
    team_score,
    opponent_score
  )
`;

export type MatchDetailRow = {
  id: string;
  date: string;
  time: string;
  opponent: string;
  season: string;
  result: string | null;
  video_url: string | null;
  notes: string | null;
  gender: string;
  venue_id: string | null;
  venues: {
    id: string;
    venue_name: string;
    location_url: string | null;
    location_type: string | null;
  } | null;
  match_sets: Array<{
    id: string;
    set_number: number;
    team_score: number;
    opponent_score: number;
  }> | null;
};

async function resolveVideoUrlFromLink(
  matchId: string,
  currentUrl: string | null
): Promise<string | null> {
  if (currentUrl) return currentUrl;

  const { data: video } = await supabaseAdmin
    .from("videos")
    .select("url")
    .eq("match_id", matchId)
    .maybeSingle();

  return video?.url ?? null;
}

/** Load a match by id (service role). Returns null when missing. */
export const getMatchById = cache(
  async (id: string): Promise<MatchDetailRow | null> => {
    const { data, error } = await supabaseAdmin
      .from("matches")
      .select(MATCH_DETAIL_SELECT)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(error.message);
    }

    if (!data) return null;

    const row = data as unknown as MatchDetailRow;
    const video_url = await resolveVideoUrlFromLink(row.id, row.video_url);

    return { ...row, video_url };
  }
);
