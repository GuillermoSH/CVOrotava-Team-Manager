import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAllowedUser } from "@/lib/auth/require-allowed-user";
import {
  getCurrentSeason,
  getNextSeason,
} from "@/utils/getCurrentSeason";

export async function GET() {
  const supabaseAuth = await supabaseServer();
  const auth = await requireAllowedUser(supabaseAuth);
  if ("response" in auth) return auth.response;

  const current = getCurrentSeason();
  const next = getNextSeason(current);
  const seeded = new Set<string>([next, current]);

  const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
    "list_distinct_video_seasons"
  );

  if (!rpcError && Array.isArray(rpcData)) {
    for (const r of rpcData as { season: string }[]) {
      if (r.season) seeded.add(r.season);
    }
  } else {
    const { data, error } = await supabaseAdmin
      .from("videos")
      .select("season")
      .order("season", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    for (const d of data ?? []) {
      if (d.season) seeded.add(d.season);
    }
  }

  const { data: matchSeasons } = await supabaseAdmin
    .from("matches")
    .select("season");
  for (const d of matchSeasons ?? []) {
    if (d.season) seeded.add(d.season);
  }

  const seasons = [...seeded].sort((a, b) => b.localeCompare(a));
  return NextResponse.json(seasons);
}
