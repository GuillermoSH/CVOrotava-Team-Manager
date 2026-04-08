import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAllowedUser } from "@/lib/auth/require-allowed-user";

export async function GET() {
  const supabaseAuth = await supabaseServer();
  const auth = await requireAllowedUser(supabaseAuth);
  if ("response" in auth) return auth.response;

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabaseAdmin
    .from("videos")
    .select("season")
    .order("season", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const uniqueSeasons = [...new Set(data.map((d) => d.season))];
  return NextResponse.json(uniqueSeasons);
}
