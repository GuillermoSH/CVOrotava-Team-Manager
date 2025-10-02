import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const category = searchParams.get("category") as "match" | "training";
  const season = searchParams.get("season");
  const competition_type = searchParams.get("competition_type");
  const gender = searchParams.get("gender");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "12", 10);

  let query = supabase
    .from("videos")
    .select("*")
    .eq("category", category);

  if (season) query = query.eq("season", season);
  if (competition_type) query = query.eq("competition_type", competition_type);
  if (gender) query = query.eq("gender", gender);

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to).order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching videos:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
