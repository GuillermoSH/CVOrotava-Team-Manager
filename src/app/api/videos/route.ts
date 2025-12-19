import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await supabaseServer(); // ✅ este es el correcto
  const { searchParams } = new URL(req.url);

  const category = searchParams.get("category") as "match" | "training";
  const season = searchParams.get("season");
  const competition_type = searchParams.get("competition_type");
  const gender = searchParams.get("gender");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "12", 10);

  let query = supabase
    .from("videos")
    .select("*");

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
    // 1️⃣ Validar autenticación
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2️⃣ Validar body
    const body = await req.json();
    const { url, category, season, competition_type, gender } = body;

    if (!url || !category) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // 3️⃣ Insertar video
    const { data, error } = await supabaseAdmin
      .from("videos")
      .upsert(
        [{ url, category, season, competition_type, gender }],
        {onConflict: 'url'}
      )
      .select();

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

