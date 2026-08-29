import { after, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAllowedUser } from "@/lib/auth/require-allowed-user";
import { requireAdmin } from "@/lib/auth/require-admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  listVideos,
  VIDEO_LIST_COLUMNS,
} from "@/lib/videos/listVideos";
import { VIDEO_LIST_WITH_MATCH, VIDEO_TYPES } from "@/lib/videos/constants";
import { linkVideoToMatch } from "@/lib/videos/syncVideoForMatch";
import { notifyNewVideo } from "@/lib/videos/notifyNewVideo";

const videoBodySchema = z.object({
  url: z.string().url(),
  video_type: z.enum(VIDEO_TYPES),
  season: z.string().min(4),
  gender: z.enum(["male", "female"]),
  match_id: z.string().uuid().nullable().optional(),
  notify_team: z.boolean().optional().default(true),
});

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const auth = await requireAllowedUser(supabase);
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(req.url);

  const video_type = searchParams.get("video_type");
  const season = searchParams.get("season");
  const gender = searchParams.get("gender");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "12", 10);
  const withoutMatch = searchParams.get("withoutMatch") === "true";
  const forMatchId = searchParams.get("forMatchId");
  const matchVideosOnly = searchParams.get("matchVideosOnly") === "true";

  try {
    const data = await listVideos({
      season,
      video_type:
        video_type && VIDEO_TYPES.includes(video_type as (typeof VIDEO_TYPES)[number])
          ? (video_type as (typeof VIDEO_TYPES)[number])
          : null,
      gender,
      page,
      limit: withoutMatch || matchVideosOnly ? 200 : limit,
      withoutMatch,
      forMatchId,
      matchVideosOnly,
    });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching videos:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();
    const auth = await requireAdmin(supabase);
    if ("response" in auth) return auth.response;

    const body = await req.json();
    const parsed = videoBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { match_id, notify_team, ...videoData } = parsed.data;

    const { data: existing } = await supabaseAdmin
      .from("videos")
      .select("id")
      .eq("url", videoData.url)
      .maybeSingle();
    const isNew = !existing;

    const { data, error } = await supabaseAdmin
      .from("videos")
      .upsert([{ ...videoData, match_id: null }], { onConflict: "url" })
      .select(VIDEO_LIST_COLUMNS)
      .single();

    if (error) {
      console.error("Error inserting video:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (match_id) {
      const linkResult = await linkVideoToMatch({
        videoId: data.id,
        matchId: match_id,
      });
      if (linkResult.error) {
        return NextResponse.json({ error: linkResult.error }, { status: 400 });
      }
    }

    if (isNew && notify_team) {
      after(() =>
        notifyNewVideo({
          video_type: videoData.video_type,
          url: videoData.url,
          gender: videoData.gender,
          season: videoData.season,
          matchId: match_id,
          excludeEmail: auth.user.email,
        })
      );
    }

    const { data: saved, error: fetchError } = await supabaseAdmin
      .from("videos")
      .select(VIDEO_LIST_WITH_MATCH)
      .eq("id", data.id)
      .single();

    if (fetchError || !saved) {
      return NextResponse.json({ success: true, data }, { status: 201 });
    }

    return NextResponse.json({ success: true, data: saved }, { status: 201 });
  } catch (err) {
    console.error("POST /api/videos error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
