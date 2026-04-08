import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAllowedUser } from "@/lib/auth/require-allowed-user";

export async function GET() {
  const supabase = await supabaseServer();
  const auth = await requireAllowedUser(supabase);
  if ("response" in auth) return auth.response;

  const { user } = auth;

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("gender, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    gender: profile?.gender ?? null,
    role: profile?.role ?? null,
  });
}
