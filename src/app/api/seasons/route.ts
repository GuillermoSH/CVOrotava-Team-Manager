import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAllowedUser } from "@/lib/auth/require-allowed-user";

export async function GET() {
  const supabaseAuth = await supabaseServer();
  const auth = await requireAllowedUser(supabaseAuth);
  if ("response" in auth) return auth.response;

  const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
    "list_distinct_video_seasons"
  );

  if (!rpcError && Array.isArray(rpcData)) {
    const seasons = (rpcData as { season: string }[]).map((r) => r.season);
    return NextResponse.json(seasons);
  }

  const { data, error } = await supabaseAdmin
    .from("videos")
    .select("season")
    .order("season", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const uniqueSeasons = [...new Set((data ?? []).map((d) => d.season))];
  return NextResponse.json(uniqueSeasons);
}
