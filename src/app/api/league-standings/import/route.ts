import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { parseStandings } from "@/lib/standings/parseStandings";
import { normalizeTeamName } from "@/lib/standings/normalize";

export const runtime = "nodejs";

const OUR_TEAM_NORMS = new Set(["voleypuerto", "cv voleypuerto", "voley puerto"]);

const formSchema = z.object({
  season: z.string().regex(/^\d{2,4}\/\d{2,4}$/u, "Formato esperado: YYYY/YY o YY/YY"),
  gender: z.enum(["male", "female"]),
});

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const auth = await requireAdmin(supabase);
  if ("response" in auth) return auth.response;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Se esperaba multipart/form-data con campo `file`." },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  const season = formData.get("season");
  const gender = formData.get("gender");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta archivo `file`." }, { status: 400 });
  }

  const meta = formSchema.safeParse({ season, gender });
  if (!meta.success) {
    return NextResponse.json({ error: meta.error.flatten() }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let parsed;
  try {
    parsed = parseStandings(buffer);
  } catch (err) {
    return NextResponse.json(
      {
        error: "No se pudo parsear el archivo.",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 400 }
    );
  }

  if (!parsed.rows.length) {
    return NextResponse.json(
      { error: "El archivo no contiene filas válidas.", warnings: parsed.warnings, headers: parsed.headers },
      { status: 400 }
    );
  }

  const rows = parsed.rows.map((r) => ({
    season: meta.data.season,
    gender: meta.data.gender,
    position: Math.round(r.position),
    team_name: r.team_name,
    normalized_name: r.normalized_name,
    is_our_team: OUR_TEAM_NORMS.has(r.normalized_name) ||
      r.normalized_name === normalizeTeamName("Voleypuerto"),
    played: Math.round(r.played),
    won: Math.round(r.won),
    lost: Math.round(r.lost),
    sets_for: Math.round(r.sets_for),
    sets_against: Math.round(r.sets_against),
    points_for: r.points_for === null ? null : Math.round(r.points_for),
    points_against:
      r.points_against === null ? null : Math.round(r.points_against),
    league_points: Math.round(r.league_points),
    uploaded_by: auth.user.id,
  }));

  // Wipe + insert para esa (season, gender) → snapshot limpio.
  const { error: deleteError } = await supabaseAdmin
    .from("league_standings")
    .delete()
    .eq("season", meta.data.season)
    .eq("gender", meta.data.gender);

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message },
      { status: 500 }
    );
  }

  const { data, error: insertError } = await supabaseAdmin
    .from("league_standings")
    .insert(rows)
    .select("id, position, team_name, normalized_name, is_our_team, league_points");

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    inserted: data?.length ?? 0,
    warnings: parsed.warnings,
    headers: parsed.headers,
    rows: data ?? [],
  });
}
