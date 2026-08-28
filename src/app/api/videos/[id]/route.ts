import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { VIDEO_LIST_COLUMNS, VIDEO_LIST_WITH_MATCH, VIDEO_TYPES, type VideoMatchSummary } from "@/lib/videos/constants";
import { linkVideoToMatch } from "@/lib/videos/syncVideoForMatch";

const videoBodySchema = z.object({
  url: z.string().url(),
  video_type: z.enum(VIDEO_TYPES),
  season: z.string().min(4),
  gender: z.enum(["male", "female"]),
  match_id: z.string().uuid().nullable().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }>}
) {
  try {
    const supabase = await supabaseServer();
    const auth = await requireAdmin(supabase);
    if ("response" in auth) return auth.response;

    const { id } = await params;
    const body = await req.json();
    const parsed = videoBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { match_id, ...videoData } = parsed.data;

    const { data, error } = await supabaseAdmin
      .from("videos")
      .update({ ...videoData, match_id: null })
      .eq("id", id)
      .select(VIDEO_LIST_COLUMNS)
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });

    const linkResult = await linkVideoToMatch({
      videoId: id,
      matchId: match_id ?? null,
    });

    if (linkResult.error) {
      return NextResponse.json({ error: linkResult.error }, { status: 400 });
    }

    const { data: saved, error: fetchError } = await supabaseAdmin
      .from("videos")
      .select(VIDEO_LIST_WITH_MATCH)
      .eq("id", id)
      .single();

    if (fetchError || !saved) {
      return NextResponse.json(data, { status: 200 });
    }

    const raw = saved as { matches?: VideoMatchSummary | VideoMatchSummary[] | null };
    const { matches, ...rest } = raw;
    const match = Array.isArray(matches) ? matches[0] ?? null : matches ?? null;

    return NextResponse.json({ ...rest, match }, { status: 200 });
  } catch (err) {
    console.error("Error en PUT /videos/[id]:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const auth = await requireAdmin(supabase);
    if ("response" in auth) return auth.response;

    const { id } = await params;

    const { data: video } = await supabaseAdmin
      .from("videos")
      .select("url, match_id")
      .eq("id", id)
      .maybeSingle();

    if (video?.match_id) {
      await supabaseAdmin
        .from("matches")
        .update({ video_url: null })
        .eq("id", video.match_id)
        .eq("video_url", video.url);
    }

    const { data, error } = await supabaseAdmin
      .from("videos")
      .delete()
      .eq("id", id)
      .select("id")
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("Error en DELETE /videos/[id]:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
