import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAllowedUser } from "@/lib/auth/require-allowed-user";
import { requireAdmin } from "@/lib/auth/require-admin";

/** Lo que usa `VideoCard` / grid; evita traer filas anchas innecesarias. */
const VIDEO_LIST_COLUMNS =
  "id, url, created_at, category, season, competition_type, gender";

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const auth = await requireAllowedUser(supabase);
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(req.url);

  const category = searchParams.get("category") as "match" | "training";
  const season = searchParams.get("season");
  const competition_type = searchParams.get("competition_type");
  const gender = searchParams.get("gender");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "12", 10);

  let query = supabaseAdmin.from("videos").select(VIDEO_LIST_COLUMNS);

  if (season) query = query.eq("season", season);
  if (competition_type) query = query.eq("competition_type", competition_type);
  if (gender) query = query.eq("gender", gender);
  if (category) query = query.eq("category", category);

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to).order("created_at", { ascending: false });
  if (!limit && !season && !gender) query = query.limit(20);

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching videos:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();
    const auth = await requireAdmin(supabase);
    if ("response" in auth) return auth.response;

    const body = await req.json();
    const { url, category, season, competition_type, gender } = body;

    if (!url || !category) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("videos")
      .upsert(
        [{ url, category, season, competition_type, gender }],
        { onConflict: "url" }
      )
      .select(VIDEO_LIST_COLUMNS);

    if (error) {
      console.error("Error inserting video:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const newVideo = data[0];

    return NextResponse.json({ success: true, data: newVideo }, { status: 201 });
  } catch (err) {
    console.error("POST /api/videos error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
