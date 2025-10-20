import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

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
        const { date, time, opponent, season, result, video_url, notes, gender, venue_id } = body;

        // Validación rápida por si el front no la hace
        if (!date || !time || !opponent || !season || !gender || !venue_id) {
            return NextResponse.json(
                { error: "Faltan campos obligatorios" },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin.from("matches").insert([
            {
                date,
                time,
                opponent,
                season,
                result: result || null,
                video_url: video_url || null,
                notes: notes || null,
                gender,
                venue_id,
            },
        ]);

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
