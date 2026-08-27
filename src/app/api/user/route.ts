import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAllowedUser } from "@/lib/auth/require-allowed-user";

export async function GET() {
  const supabase = await supabaseServer();
  const auth = await requireAllowedUser(supabase, { allowInactive: true });
  if ("response" in auth) return auth.response;

  const { user } = auth;

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("gender, role, user_name, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const isAdmin = profile?.role === "admin";
  const isActive = isAdmin ? true : profile?.is_active !== false;

  return NextResponse.json({
    id: user.id,
    email: user.email,
    user_name: profile?.user_name ?? user.email,
    gender: profile?.gender ?? null,
    role: profile?.role ?? null,
    isAdmin,
    isActive,
  });
}
