import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAllowedUser } from "@/lib/auth/require-allowed-user";
import { z } from "zod";

const matchSchema = z.object({
  date: z.string(),
  time: z.string(),
  opponent: z.string(),
  season: z.string(),
  gender: z.enum(["male", "female"]),
  venue_id: z.string().uuid(),
  result: z.string().optional().nullable(),
  video_url: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  match_sets: z
    .array(
      z.object({
        team_score: z.number().int(),
        opponent_score: z.number().int(),
      })
    )
    .optional(),
});

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const auth = await requireAllowedUser(supabase);
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(req.url);

  const limit = Number(searchParams.get("limit")) || null;
  const gender = searchParams.get("gender");
  const orderParam = searchParams.get("order") || "desc";
  const hasResult = searchParams.get("hasResult") === "true";
  const ascending = orderParam === "asc";

  try {
    let query = supabaseAdmin
      .from("matches")
      .select(
        "*, venues(id, venue_name, location_type, location_url), match_sets(id, set_number, team_score, opponent_score)"
      )
      .order("date", { ascending })
      .order("time", { ascending });

    if (gender) query = query.eq("gender", gender);
    if (limit) query = query.limit(limit);
    if (hasResult) query = query.not("result", "is", null).neq("result", "");

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    console.error("❌ Error fetching matches:", err);
    return NextResponse.json(
      { error: "Error fetching matches", details: err instanceof Error ? err.message : String(err) },
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
        const supabase = await supabaseServer();
        const auth = await requireAllowedUser(supabase);
        if ("response" in auth) return auth.response;

        const body = await req.json();
        const parsed = matchSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { match_sets, ...match } = parsed.data;

        // Limpiar nulos
        const matchData = {
          ...match,
          result: match.result || null,
          video_url: match.video_url || null,
          notes: match.notes || null,
        };

        const { data, error } = await supabaseAdmin
            .from("matches")
            .insert([matchData])
            .select()
            .single();

        if (error) {
            console.error("❌ Error al insertar partido:", error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        if (match_sets && match_sets.length > 0) {
            const formattedSets = match_sets.map((s, idx) => ({
                match_id: data.id,
                set_number: idx + 1,
                team_score: s.team_score,
                opponent_score: s.opponent_score
            }));
            const { error: setsError } = await supabaseAdmin.from("match_sets").insert(formattedSets);
            if (setsError) {
                console.error("❌ Error al insertar sets:", setsError);
                return NextResponse.json({ error: "El partido se creó, pero falló la carga de sus sets." }, { status: 500 });
            }
        }

        return NextResponse.json(
            { message: "Partido creado con éxito", data },
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
