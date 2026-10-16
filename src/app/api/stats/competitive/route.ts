import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAllowedUser } from "@/lib/auth/require-allowed-user";
import { getCompetitiveStats } from "@/lib/stats/competitive/load";

/**
 * GET /api/stats/competitive?season=&gender=
 * Estadísticas competitivas (ficha, rivales, logros…) calculadas desde los
 * datos sincronizados con la federación: temporada pedida + la anterior.
 */
export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const auth = await requireAllowedUser(supabase);
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  const season = searchParams.get("season");
  const gender = searchParams.get("gender");
  if (!season || (gender !== "male" && gender !== "female")) {
    return NextResponse.json({ error: "Parámetros `season` y `gender` son obligatorios." }, { status: 400 });
  }

  try {
    return NextResponse.json(await getCompetitiveStats(season, gender));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
