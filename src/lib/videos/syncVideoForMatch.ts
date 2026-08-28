import { supabaseAdmin } from "@/lib/supabase/admin";
import type { VideoType } from "@/lib/videos/constants";

const MATCH_VIDEO_TYPES: VideoType[] = ["league_match", "friendly_match"];

export type SyncVideoForMatchParams = {
  matchId: string;
  videoUrl: string | null | undefined;
  season: string;
  gender: "male" | "female";
  videoType?: VideoType;
};

/** Clear match_id on any video currently linked to this match. */
async function clearVideosForMatch(matchId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("videos")
    .update({ match_id: null })
    .eq("match_id", matchId);

  if (error) {
    console.error("[syncVideoForMatch] clearVideosForMatch:", error.message);
  }
}

/** Sync videos ↔ matches when saving a match with (or without) a video URL. */
export async function syncVideoForMatch(
  params: SyncVideoForMatchParams
): Promise<void> {
  const url =
    typeof params.videoUrl === "string" ? params.videoUrl.trim() : "";
  const videoType = params.videoType ?? "league_match";

  if (!url) {
    await clearVideosForMatch(params.matchId);
    const { error } = await supabaseAdmin
      .from("matches")
      .update({ video_url: null })
      .eq("id", params.matchId);

    if (error) {
      console.error("[syncVideoForMatch] clear match video_url:", error.message);
    }
    return;
  }

  // Release match_id from any other video that held this match
  await clearVideosForMatch(params.matchId);

  const { data: byUrl, error: selectError } = await supabaseAdmin
    .from("videos")
    .select("id")
    .eq("url", url)
    .maybeSingle();

  if (selectError) {
    console.error("[syncVideoForMatch] select by url:", selectError.message);
    return;
  }

  const videoPayload = {
    url,
    match_id: params.matchId,
    season: params.season,
    gender: params.gender,
    video_type: videoType,
  };

  if (byUrl) {
    const { error: updateError } = await supabaseAdmin
      .from("videos")
      .update(videoPayload)
      .eq("id", byUrl.id);

    if (updateError) {
      console.error("[syncVideoForMatch] update video:", updateError.message);
      return;
    }
  } else {
    const { error: insertError } = await supabaseAdmin
      .from("videos")
      .insert(videoPayload);

    if (insertError?.code === "23505") {
      const { error: retryError } = await supabaseAdmin
        .from("videos")
        .update(videoPayload)
        .eq("url", url);

      if (retryError) {
        console.error("[syncVideoForMatch] retry update:", retryError.message);
      }
    } else if (insertError) {
      console.error("[syncVideoForMatch] insert:", insertError.message);
      return;
    }
  }

  const { error: matchError } = await supabaseAdmin
    .from("matches")
    .update({ video_url: url })
    .eq("id", params.matchId);

  if (matchError) {
    console.error("[syncVideoForMatch] update match video_url:", matchError.message);
  }
}

export type LinkVideoToMatchParams = {
  videoId: string;
  matchId: string | null;
};

/** Link or unlink a video row to a match (video library → match). */
export async function linkVideoToMatch(
  params: LinkVideoToMatchParams
): Promise<{ error?: string }> {
  const { data: video, error: videoError } = await supabaseAdmin
    .from("videos")
    .select("id, url, video_type, season, gender, match_id")
    .eq("id", params.videoId)
    .maybeSingle();

  if (videoError || !video) {
    return { error: "Vídeo no encontrado" };
  }

  if (!params.matchId) {
    if (video.match_id) {
      await supabaseAdmin
        .from("matches")
        .update({ video_url: null })
        .eq("id", video.match_id)
        .eq("video_url", video.url);
    }

    const { error } = await supabaseAdmin
      .from("videos")
      .update({ match_id: null })
      .eq("id", params.videoId);

    if (error) return { error: error.message };
    return {};
  }

  if (!MATCH_VIDEO_TYPES.includes(video.video_type as VideoType)) {
    return { error: "Solo se pueden vincular vídeos de partido" };
  }

  const { data: match, error: matchError } = await supabaseAdmin
    .from("matches")
    .select("id, season, gender")
    .eq("id", params.matchId)
    .maybeSingle();

  if (matchError || !match) {
    return { error: "Partido no encontrado" };
  }

  if (video.season !== match.season || video.gender !== match.gender) {
    return {
      error: "El vídeo y el partido deben ser de la misma temporada y género",
    };
  }

  await syncVideoForMatch({
    matchId: params.matchId,
    videoUrl: video.url,
    season: video.season,
    gender: video.gender as "male" | "female",
    videoType: video.video_type as VideoType,
  });

  return {};
}
