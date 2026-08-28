import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAllowedUser } from "@/lib/auth/require-allowed-user";
import { listSeasons } from "@/lib/seasons/listSeasons";

export async function GET() {
  const supabaseAuth = await supabaseServer();
  const auth = await requireAllowedUser(supabaseAuth, { allowInactive: true });
  if ("response" in auth) return auth.response;

  try {
    const seasons = await listSeasons();
    return NextResponse.json(seasons);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
