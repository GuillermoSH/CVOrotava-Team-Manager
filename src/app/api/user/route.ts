import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "No autenticado", user: null }, { status: 401 });
  }

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
