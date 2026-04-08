import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Valida sesión Supabase (cookies) y que el email siga en allowed_emails.
 * Usar en Route Handlers antes de operar con service role.
 */
export async function requireAllowedUser(supabase: SupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return {
      response: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    } as const;
  }

  const { data: allowed } = await supabase
    .from("allowed_emails")
    .select("email")
    .eq("email", user.email)
    .maybeSingle();

  if (!allowed) {
    return {
      response: NextResponse.json({ error: "No autorizado" }, { status: 403 }),
    } as const;
  }

  return { user: { id: user.id, email: user.email } } as const;
}

/**
 * Comprueba allowlist por email (p. ej. tras validar JWT con admin.auth.getUser).
 */
export async function assertEmailAllowed(
  supabase: SupabaseClient,
  email: string
): Promise<NextResponse | null> {
  const { data: allowed } = await supabase
    .from("allowed_emails")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  if (!allowed) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  return null;
}
