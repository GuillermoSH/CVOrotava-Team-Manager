import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAllowedUser } from "./require-allowed-user";

/**
 * Combina allowlist + role admin. Devuelve { user } o { response } con 401/403.
 */
export async function requireAdmin(supabase: SupabaseClient) {
  const auth = await requireAllowedUser(supabase);
  if ("response" in auth) return auth;

  const { data: profile, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (error || profile?.role !== "admin") {
    return {
      response: NextResponse.json(
        { error: "Acceso denegado. Solo administradores." },
        { status: 403 }
      ),
    } as const;
  }

  return { user: auth.user } as const;
}
