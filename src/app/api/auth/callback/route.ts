import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  clearSupabaseAuthCookies,
  isEmailAllowlisted,
  normalizeEmail,
} from "@/lib/auth/allowlist";
import { getUserActivity } from "@/lib/auth/userActivity";
import {
  GATE_COOKIE,
  GATE_TTL_SEC,
  gateCookieOptions,
  signGate,
} from "@/lib/auth/gate";

type PendingCookie = {
  name: string;
  value: string;
  options: Record<string, unknown>;
};

/**
 * Google OAuth PKCE callback.
 *
 * Next 15 does not reliably merge `cookies().set(...)` into a later
 * `NextResponse.redirect(...)`. We buffer every cookie write and apply them
 * onto the final redirect response.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const origin = url.origin;

  if (!code) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const pending = new Map<string, PendingCookie>();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            pending.set(name, { name, value, options });
          });
        },
      },
    }
  );

  const finish = (path: string, clearAuth = false) => {
    const response = NextResponse.redirect(new URL(path, origin));
    pending.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    if (clearAuth) {
      clearSupabaseAuthCookies(response, request.url);
    }
    return response;
  };

  // El intercambio ya devuelve el usuario (respuesta directa de Auth): no hace
  // falta un getUser aparte, que sería otro viaje a Supabase.
  const { data: exchanged, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error("OAuth code exchange failed:", exchangeError.message);
    return finish("/login?error=auth", true);
  }

  const user = exchanged.user;

  if (!user?.email) {
    await supabase.auth.signOut();
    return finish("/login?error=no-email", true);
  }

  const email = normalizeEmail(user.email);

  // Allowlist y perfil no dependen entre sí: en paralelo (un viaje en vez de
  // dos). El perfil solo se usa si el correo está permitido.
  const [allowed, activity] = await Promise.all([
    isEmailAllowlisted(supabaseAdmin, email),
    getUserActivity(user.id),
  ]);

  if (!allowed) {
    // Kill refresh tokens server-side even if a cookie leaks through.
    try {
      await supabaseAdmin.auth.admin.signOut(user.id, "global");
    } catch (err) {
      console.error("Failed to globally revoke session for denied user:", err);
    }

    await supabase.auth.signOut();
    console.warn(`Access denied for ${email} (${user.id})`);
    return finish("/login?error=unauthorized", true);
  }

  // Correo ya verificado arriba: se entrega el gate firmado para que la primera
  // página protegida no repita allowlist + perfil en el proxy. Sin secreto
  // (producción mal configurada) signGate devuelve null y el proxy lo resuelve.
  const gateToken = await signGate({
    sub: user.id,
    email,
    is_active: activity.is_active,
    isAdmin: activity.isAdmin,
    role: activity.role,
    user_name: activity.user_name ?? email,
    gender: activity.gender,
    exp: Math.floor(Date.now() / 1000) + GATE_TTL_SEC,
  });

  const response = finish(activity.is_active ? "/" : "/payments");
  if (gateToken) {
    response.cookies.set(GATE_COOKIE, gateToken, gateCookieOptions());
  }
  return response;
}
