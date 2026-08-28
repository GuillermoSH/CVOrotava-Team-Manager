import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAllowedUser } from "@/lib/auth/require-allowed-user";
import { listStatsMatches } from "@/lib/stats/listStatsMatches";

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const auth = await requireAllowedUser(supabase);
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  const season = searchParams.get("season");
  const gender = searchParams.get("gender");

  try {
    const matches = await listStatsMatches({ season, gender });
    return NextResponse.json({ matches });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
