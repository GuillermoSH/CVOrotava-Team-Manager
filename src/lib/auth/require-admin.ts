import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAllowedUser } from "./require-allowed-user";

/**
 * Allowlist + club admin. Role is read via service role inside
 * requireAllowedUser / getUserActivity (not the caller's RLS-scoped client).
 */
export async function requireAdmin(supabase: SupabaseClient) {
  const auth = await requireAllowedUser(supabase);
  if ("response" in auth) return auth;

  if (!auth.user.isAdmin) {
    return {
      response: NextResponse.json(
        { error: "Acceso denegado. Solo administradores." },
        { status: 403 }
      ),
    } as const;
  }

  return { user: auth.user } as const;
}
