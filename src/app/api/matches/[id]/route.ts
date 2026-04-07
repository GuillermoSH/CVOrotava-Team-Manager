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

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

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

    const { data: updatedMatch, error } = await supabaseAdmin
      .from("matches")
      .update({
        date: body.date,
        time: body.time,
        opponent: body.opponent,
        season: body.season,
        result: body.result || null,
        video_url: body.video_url || null,
        notes: body.notes || null,
        gender: body.gender,
        venue_id: body.venue_id,
      })
      .eq("id", id)
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });

    // Handle nested match sets
    if (body.match_sets !== undefined) {
      await supabaseAdmin.from("match_sets").delete().eq("match_id", id);
      
      if (body.match_sets && body.match_sets.length > 0) {
        const formattedSets = body.match_sets.map((s: any, idx: number) => ({
          match_id: id,
          set_number: idx + 1,
          team_score: s.team_score,
          opponent_score: s.opponent_score
        }));
        const { error: setsError } = await supabaseAdmin.from("match_sets").insert(formattedSets);
        if (setsError) {
          console.error("❌ Error al insertar sets en PUT:", setsError);
          return NextResponse.json({ error: "Partido actualizado temporalmente pero falló almacenamiento de sets." }, { status: 500 });
        }
      }
    }

    return NextResponse.json(updatedMatch, { status: 200 });
  } catch (err) {
    console.error("Error en PUT /matches/[id]:", err);
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
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from("matches")
      .delete()
      .eq("id", id)
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("Error en DELETE /matches/[id]:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
