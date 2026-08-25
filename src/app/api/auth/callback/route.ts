import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  clearSupabaseAuthCookies,
  isEmailAllowlisted,
  normalizeEmail,
} from "@/lib/auth/allowlist";

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

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error("OAuth code exchange failed:", exchangeError.message);
    return finish("/login?error=auth", true);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    await supabase.auth.signOut();
    return finish("/login?error=no-email", true);
  }

  const email = normalizeEmail(user.email);
  const allowed = await isEmailAllowlisted(supabaseAdmin, email);

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

  return finish("/");
}
