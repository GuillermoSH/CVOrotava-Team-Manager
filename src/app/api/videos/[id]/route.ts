import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAllowedUser } from "@/lib/auth/require-allowed-user";

const VIDEO_LIST_COLUMNS =
  "id, url, created_at, category, season, competition_type, gender";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }>}
) {
  try {
    const supabase = await supabaseServer();
    const auth = await requireAllowedUser(supabase);
    if ("response" in auth) return auth.response;

    const { id } = await params;
    const body = await req.json();

    const { data, error } = await supabaseAdmin
      .from("videos")
      .update({
        url: body.url,
        category: body.category,
        season: body.season,
        competition_type: body.competition_type,
        gender: body.gender,
      })
      .eq("id", id)
      .select(VIDEO_LIST_COLUMNS)
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json(data, { status: 200 });
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
    const auth = await requireAllowedUser(supabase);
    if ("response" in auth) return auth.response;

    const { id } = await params;

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
