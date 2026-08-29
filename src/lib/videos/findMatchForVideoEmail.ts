import { supabaseAdmin } from "@/lib/supabase/admin";
import type { VideoType } from "@/lib/videos/constants";
import type { VideoEmailMatchInput } from "@/lib/videos/videoEmailCopy";

const MATCH_EMAIL_SELECT = `
  id,
  date,
  time,
  opponent,
  season,
  result,
  gender,
  video_url,
  venues (venue_name, location_type),
  match_sets (set_number, team_score, opponent_score)
`;

type MatchRow = VideoEmailMatchInput & {
  video_url?: string | null;
  venues?: VideoEmailMatchInput["venues"] | VideoEmailMatchInput["venues"][];
};

function firstVenue(
  venues: MatchRow["venues"]
): VideoEmailMatchInput["venues"] {
  if (!venues) return null;
  return Array.isArray(venues) ? (venues[0] ?? null) : venues;
}

function normalize(row: MatchRow): VideoEmailMatchInput {
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    opponent: row.opponent,
    result: row.result,
    venues: firstVenue(row.venues),
    match_sets: row.match_sets ?? null,
  };
}

/** Linked match, same YouTube URL, or the only unfinished-video league game. */
export async function findMatchForVideoEmail(opts: {
  matchId?: string | null;
  url: string;
  gender: "male" | "female";
  season?: string;
  videoType: VideoType;
}): Promise<VideoEmailMatchInput | null> {
  if (opts.matchId) {
    const { data, error } = await supabaseAdmin
      .from("matches")
      .select(MATCH_EMAIL_SELECT)
      .eq("id", opts.matchId)
      .maybeSingle();
    if (error || !data) return null;
    return normalize(data as unknown as MatchRow);
  }

  const { data: byUrl, error: urlError } = await supabaseAdmin
    .from("matches")
    .select(MATCH_EMAIL_SELECT)
    .eq("video_url", opts.url)
    .limit(1)
    .maybeSingle();

  if (!urlError && byUrl) return normalize(byUrl as unknown as MatchRow);

  if (opts.videoType !== "league_match" || !opts.season) return null;

  const { data: played, error: playedError } = await supabaseAdmin
    .from("matches")
    .select(MATCH_EMAIL_SELECT)
    .eq("gender", opts.gender)
    .eq("season", opts.season)
    .not("result", "is", null)
    .neq("result", "")
    .order("date", { ascending: false })
    .order("time", { ascending: false });

  if (playedError || !played?.length) return null;

  const unmatched = (played as unknown as MatchRow[]).filter(
    (m) => !m.video_url || m.video_url === opts.url
  );
  if (unmatched.length !== 1) return null;
  return normalize(unmatched[0]!);
}
