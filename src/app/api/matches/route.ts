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

/**
 * GET /api/matches
 * Devuelve todos los partidos ordenados por fecha y hora
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const season = searchParams.get("season");

    try {
        let query = supabaseAdmin
            .from("matches")
            .select(`*, venues (id, venue_name, location_url, location_type)`)
            .order("date", { ascending: true })
            .order("time", { ascending: true });

        if (season) query = query.eq("season", season);

        const { data, error } = await query;

        if (error) {
            console.error("Error en GET /matches:", error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json(data || [], { status: 200 });
    } catch (err) {
        console.error("Error inesperado en GET /matches:", err);
        return NextResponse.json(
            { error: "Error interno del servidor" },
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
