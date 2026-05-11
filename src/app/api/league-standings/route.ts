import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAllowedUser } from "@/lib/auth/require-allowed-user";

/**
 * GET /api/league-standings?season=&gender=
 * Lista la clasificación importada para una temporada+género.
 */
export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const auth = await requireAllowedUser(supabase);
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  const season = searchParams.get("season");
  const gender = searchParams.get("gender");

  let query = supabaseAdmin
    .from("league_standings")
    .select(
      "id, season, gender, position, team_name, normalized_name, is_our_team, played, won, lost, sets_for, sets_against, points_for, points_against, league_points, uploaded_at"
    )
    .order("position", { ascending: true });

  if (season) query = query.eq("season", season);
  if (gender) query = query.eq("gender", gender);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
