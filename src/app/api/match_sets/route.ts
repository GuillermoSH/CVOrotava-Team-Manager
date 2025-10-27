import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// 🟢 POST → crear o actualizar sets en bloque
export async function POST(req: Request) {
  try {
    const sets = await req.json(); // array [{match_id, set_number, team_score, opponent_score}]

    const { data, error } = await supabaseAdmin
      .from("match_sets")
      .upsert(sets, { onConflict: "match_id,set_number" })
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("Error en POST /match_sets:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
