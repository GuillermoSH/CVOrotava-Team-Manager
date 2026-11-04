import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAllowedUser } from "@/lib/auth/require-allowed-user";
import { listStatsMatches } from "@/lib/stats/listStatsMatches";
import { getCompetitiveStats } from "@/lib/stats/competitive/load";

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const auth = await requireAllowedUser(supabase);
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  const season = searchParams.get("season");
  const gender = searchParams.get("gender");

  try {
    // Con temporada y género también van las estadísticas competitivas: una sola petición en vez de dos.
    const wantsCompetitive = Boolean(season) && (gender === "male" || gender === "female");
    const [matches, competitive] = await Promise.all([
      listStatsMatches({ season, gender }),
      wantsCompetitive ? getCompetitiveStats(season!, gender as "male" | "female") : Promise.resolve(null),
    ]);
    return NextResponse.json({ matches, competitive });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
