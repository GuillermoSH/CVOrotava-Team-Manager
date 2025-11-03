import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const { searchParams } = new URL(req.url);
  const season = searchParams.get("season");
  const gender = searchParams.get("gender");

  let query = supabase.from("matches").select("*, venues(*)");

  if (season) query = query.eq("season", season);
  if (gender) query = query.eq("gender", gender);
  query = query.not("result", "is", null).neq("result", "");

  const { data: matches, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ matches });
}