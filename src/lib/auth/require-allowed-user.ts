import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isEmailAllowlisted, normalizeEmail } from "@/lib/auth/allowlist";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserActivity } from "@/lib/auth/userActivity";
import {
  claimsMatchUser,
  readGateFromRequest,
} from "@/lib/auth/gate";

export type RequireAllowedOptions = {
  /**
   * When true, inactive club members may call this route
   * (e.g. GET payments, seasons for payment filters).
   * Admins are always allowed regardless.
   */
  allowInactive?: boolean;
};

export type AllowedUser = {
  id: string;
  email: string;
  isActive: boolean;
  isAdmin: boolean;
  role: string | null;
  user_name: string;
  gender: "male" | "female" | null;
};

/**
 * Valida sesión Supabase (cookies) y que el email siga en allowed_emails.
 * Por defecto bloquea usuarios con is_active = false (salvo admin).
 * Reuses the short-lived gate cookie/header when present so allowlist +
 * users row are not re-fetched on every API/RSC.
 */
export async function requireAllowedUser(
  supabase: SupabaseClient,
  options: RequireAllowedOptions = {}
) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return {
      response: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    } as const;
  }

  const email = normalizeEmail(user.email);
  const gate = await readGateFromRequest();
  if (gate && claimsMatchUser(gate, user.id, email)) {
    if (!gate.is_active && !options.allowInactive) {
      return {
        response: NextResponse.json(
          {
            error:
              "Cuenta inactiva. Solo puedes consultar tus pagos; pide reactivación a un admin si vuelves al club.",
            code: "inactive",
          },
          { status: 403 }
        ),
      } as const;
    }
    return {
      user: {
        id: user.id,
        email,
        isActive: gate.is_active,
        isAdmin: gate.isAdmin,
        role: gate.role,
        user_name: gate.user_name,
        gender: gate.gender,
      } satisfies AllowedUser,
    } as const;
  }

  const allowed = await isEmailAllowlisted(supabaseAdmin, email);

  if (!allowed) {
    return {
      response: NextResponse.json({ error: "No autorizado" }, { status: 403 }),
    } as const;
  }

  // isAdmin from getUserActivity (DB row), never JWT metadata.
  const activity = await getUserActivity(user.id);
  if (!activity.is_active && !options.allowInactive) {
    return {
      response: NextResponse.json(
        {
          error:
            "Cuenta inactiva. Solo puedes consultar tus pagos; pide reactivación a un admin si vuelves al club.",
          code: "inactive",
        },
        { status: 403 }
      ),
    } as const;
  }

  return {
    user: {
      id: user.id,
      email,
      isActive: activity.is_active,
      isAdmin: activity.isAdmin,
      role: activity.role,
      user_name: activity.user_name ?? email,
      gender: activity.gender,
    } satisfies AllowedUser,
  } as const;
}

/**
 * Comprueba allowlist por email (p. ej. tras validar JWT con admin.auth.getUser).
 */
export async function assertEmailAllowed(
  _supabase: SupabaseClient,
  email: string
): Promise<NextResponse | null> {
  const allowed = await isEmailAllowlisted(supabaseAdmin, normalizeEmail(email));
  if (!allowed) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  return null;
}
