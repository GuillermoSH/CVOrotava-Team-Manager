import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// TODO: params quitar el PROMISE (arreglo de bug temporal en vercel)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }>}
) {
  try {
    const { id } = await params;
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
      .eq("id", id)
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("Error en GET /matches/[id]:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// TODO: params quitar el PROMISE (arreglo de bug temporal en vercel)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }>}
) {
  try {
    const { id } = await params;
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
      .eq("id", id)
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("Error en PUT /matches/[id]:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
