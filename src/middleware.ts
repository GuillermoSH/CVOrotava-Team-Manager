import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  clearSupabaseAuthCookies,
  isEmailAllowlisted,
  normalizeEmail,
} from "@/lib/auth/allowlist";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isApiRoute =
    pathname.startsWith("/api/") && !pathname.startsWith("/api/auth");

  if (isApiRoute) {
    return supabaseResponse;
  }

  const isPublicPath =
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/assets");

  if (!user && !isPublicPath) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // Session present: enforce allowlist before any protected page.
  if (user?.email && !isPublicPath) {
    const allowed = await isEmailAllowlisted(
      supabaseAdmin,
      normalizeEmail(user.email)
    );

    if (!allowed) {
      try {
        await supabaseAdmin.auth.admin.signOut(user.id, "global");
      } catch {
        /* best-effort */
      }
      await supabase.auth.signOut();

      const denied = NextResponse.redirect(
        new URL("/login?error=unauthorized", request.url)
      );
      // Preserve any cookie mutations from signOut, then force-clear.
      supabaseResponse.cookies.getAll().forEach(({ name, value }) => {
        denied.cookies.set(name, value);
      });
      clearSupabaseAuthCookies(denied, request.url);
      return denied;
    }
  }

  if (user && pathname === "/login") {
    const err = request.nextUrl.searchParams.get("error");
    if (err === "unauthorized" || err === "auth" || err === "no-email") {
      // If they still have a session on an error screen, wipe it.
      if (err === "unauthorized" || err === "no-email") {
        try {
          if (user.id) {
            await supabaseAdmin.auth.admin.signOut(user.id, "global");
          }
        } catch {
          /* best-effort */
        }
        await supabase.auth.signOut();
        const cleaned = NextResponse.next({ request });
        supabaseResponse.cookies.getAll().forEach(({ name, value }) => {
          cleaned.cookies.set(name, value);
        });
        clearSupabaseAuthCookies(cleaned, request.url);
        return cleaned;
      }
      return supabaseResponse;
    }
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    return NextResponse.redirect(homeUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
