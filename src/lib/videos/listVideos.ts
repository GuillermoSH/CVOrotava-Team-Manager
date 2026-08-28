import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  DEFAULT_VIDEO_PAGE_SIZE,
  MATCH_VIDEO_TYPES,
  VIDEO_LIST_COLUMNS,
  VIDEO_LIST_WITH_MATCH,
  type ListVideosOpts,
  type VideoListItem,
  type VideoMatchSummary,
} from "@/lib/videos/constants";

export {
  DEFAULT_VIDEO_PAGE_SIZE,
  VIDEO_LIST_COLUMNS,
  type ListVideosOpts,
  type VideoListItem,
} from "@/lib/videos/constants";

function normalizeMatch(
  matches: VideoMatchSummary | VideoMatchSummary[] | null | undefined
): VideoMatchSummary | null {
  if (!matches) return null;
  if (Array.isArray(matches)) return matches[0] ?? null;
  return matches;
}

export async function listVideos(
  opts: ListVideosOpts = {}
): Promise<VideoListItem[]> {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? DEFAULT_VIDEO_PAGE_SIZE;

  let query = supabaseAdmin.from("videos").select(VIDEO_LIST_WITH_MATCH);

  if (opts.season) query = query.eq("season", opts.season);
  if (opts.video_type) query = query.eq("video_type", opts.video_type);
  if (opts.gender) query = query.eq("gender", opts.gender);

  if (opts.matchVideosOnly) {
    query = query.in("video_type", MATCH_VIDEO_TYPES);
  }

  if (opts.withoutMatch) {
    if (opts.forMatchId) {
      query = query.or(`match_id.is.null,match_id.eq.${opts.forMatchId}`);
    } else {
      query = query.is("match_id", null);
    }
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error } = await query
    .range(from, to)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const raw = row as VideoListItem & {
      matches?: VideoMatchSummary | VideoMatchSummary[] | null;
    };
    const { matches, ...rest } = raw;
    return {
      ...rest,
      match: normalizeMatch(matches),
    };
  });
}
