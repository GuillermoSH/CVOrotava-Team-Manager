import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { supabaseServer } from "@/lib/supabaseServer";

const ADMIN_EMAILS = ["siciliahernandezguillermo@gmail.com"];

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

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseServer.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ADMIN_EMAILS.includes(user.email!)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { url, category, season, competition_type, gender } = body;

    if (!url || !category) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from("videos")
      .insert([{ url, category, season, competition_type, gender }])
      .select();

    if (error) {
      console.error("Error inserting video:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data[0], { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
