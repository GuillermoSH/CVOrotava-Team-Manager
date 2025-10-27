import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// 🟢 GET /api/matches/[id]  → devuelve partido + sets
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabaseAdmin
      .from("matches")
      .select(
        `
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
      `
      )
      .eq("id", params.id)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("Error en GET /matches/[id]:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// 🟠 PUT /api/matches/[id]  → actualiza partido
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();

    const { data, error } = await supabaseAdmin
      .from("matches")
      .update({
        date: body.date,
        time: body.time,
        opponent: body.opponent,
        season: body.season,
        video_url: body.video_url,
        notes: body.notes,
        gender: body.gender,
        venue_id: body.venue_id,
      })
      .eq("id", params.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("Error en PUT /matches/[id]:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
