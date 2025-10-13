import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

/**
 * GET /api/matches
 * Devuelve todos los partidos ordenados por fecha y hora
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const season = searchParams.get("season");

    let query = supabaseServer.from("matches").select("*");

    if (season) query = query.eq("season", season);
    try {
        const { data, error } = await query
            .order("date", { ascending: true })
            .order("time", { ascending: true });

        if (error) {
            console.error("Error en GET /matches:", error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json(data || [], { status: 200 });
    } catch (err) {
        console.error("Error inesperado en GET /matches:", err);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

/**
 * POST /api/matches
 * Crea un nuevo partido
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Validación mínima de campos requeridos
        if (!body.date || !body.time || !body.opponent || !body.location || !body.season) {
            return NextResponse.json(
                { error: "Faltan campos obligatorios." },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseServer
            .from("matches")
            .insert([body])
            .select();

        if (error) {
            console.error("Error en POST /matches:", error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json(data?.[0], { status: 201 });
    } catch (err) {
        console.error("Error inesperado en POST /matches:", err);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
