import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  const { data, error } = await supabase
    .from("videos")
    .select("season")
    .order("season", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const uniqueSeasons = [...new Set(data.map((d) => d.season))];
  return NextResponse.json(uniqueSeasons);
}
