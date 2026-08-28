import { syncVideoForMatch } from "@/lib/videos/syncVideoForMatch";

/**
 * @deprecated Use syncVideoForMatch with matchId instead.
 * Kept as thin wrapper for backwards compatibility during migration.
 */
export async function ensureVideoFromMatchUrl(params: {
  matchId?: string;
  videoUrl: string | null | undefined;
  season: string | null | undefined;
  gender: string | null | undefined;
}): Promise<void> {
  if (!params.matchId) return;

  await syncVideoForMatch({
    matchId: params.matchId,
    videoUrl: params.videoUrl,
    season: params.season ?? "",
    gender: (params.gender as "male" | "female") ?? "male",
    videoType: "league_match",
  });
}
