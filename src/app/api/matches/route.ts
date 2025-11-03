import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";

const matchSchema = z.object({
    date: z.string(),
    time: z.string(),
    opponent: z.string(),
    season: z.string(),
    gender: z.enum(["male", "female"]),
    venue_id: z.string().uuid(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const limit = Number(searchParams.get("limit")) || null;
  const gender = searchParams.get("gender");
  const orderParam = searchParams.get("order") || "desc";
  const hasResult = searchParams.get("hasResult") === "true";
  const ascending = orderParam === "asc";

  try {
    let query = supabaseAdmin
      .from("matches")
      .select("*, venues(venue_name, location_type)")
      .order("date", { ascending })
      .order("time", { ascending });

    if (gender) query = query.eq("gender", gender);
    if (limit) query = query.limit(limit);
    if (hasResult) query = query.not("result", "is", null).neq("result", "");

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("❌ Error fetching matches:", err);
    return NextResponse.json(
      { error: "Error fetching matches", details: err.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/matches
 * Crea un nuevo partido
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const parsed = matchSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const match = parsed.data;

        const { data, error } = await supabaseAdmin
            .from("matches")
            .insert([match])
            .select()
            .single();

        if (error) {
            console.error("❌ Error al insertar partido:", error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json(
            { message: "✅ Partido creado con éxito", data },
            { status: 201 }
        );
    } catch (err) {
        console.error("💥 Error inesperado en POST /matches:", err);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
