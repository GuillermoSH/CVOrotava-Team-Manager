import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAllowedUser } from "@/lib/auth/require-allowed-user";

export async function GET() {
  const supabase = await supabaseServer();
  const auth = await requireAllowedUser(supabase);
  if ("response" in auth) return auth.response;

  const { data, error } = await supabaseAdmin
    .from("venues")
    .select("id, venue_name, location_type");

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(data || []);
}
