import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  clearSupabaseAuthCookies,
  isEmailAllowlisted,
  normalizeEmail,
} from "@/lib/auth/allowlist";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  getUserActivity,
  isInactiveAllowedPath,
} from "@/lib/auth/userActivity";
import {
  GATE_COOKIE,
  GATE_HEADER,
  GATE_TTL_SEC,
  claimsMatchUser,
  gateCookieOptions,
  signGate,
  verifyGate,
  type GateClaims,
} from "@/lib/auth/gate";

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach(({ name, value }) => {
    to.cookies.set(name, value);
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isApiRoute =
    pathname.startsWith("/api/") && !pathname.startsWith("/api/auth");

  // APIs authenticate in the handler (requireAllowedUser). Skip getUser here
  // so each fetch isn't a second round-trip to Supabase Auth.
  if (isApiRoute) {
    return NextResponse.next({ request });
  }

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

  let gateToken: string | null = null;

  // Session present: enforce allowlist before any protected page.
  if (user?.email && !isPublicPath) {
    const email = normalizeEmail(user.email);
    const existing = await verifyGate(request.cookies.get(GATE_COOKIE)?.value);
    let claims: GateClaims | null =
      existing && claimsMatchUser(existing, user.id, email) ? existing : null;

    if (!claims) {
      const allowed = await isEmailAllowlisted(supabaseAdmin, email);

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
        copyCookies(supabaseResponse, denied);
        clearSupabaseAuthCookies(denied, request.url);
        denied.cookies.set(GATE_COOKIE, "", gateCookieOptions(0));
        return denied;
      }

      const activity = await getUserActivity(user.id);
      claims = {
        sub: user.id,
        email,
        is_active: activity.is_active,
        isAdmin: activity.isAdmin,
        role: activity.role,
        user_name: activity.user_name ?? email,
        gender: activity.gender,
        exp: Math.floor(Date.now() / 1000) + GATE_TTL_SEC,
      };
    }

    if (!claims.is_active && !isInactiveAllowedPath(pathname)) {
      const paymentsUrl = request.nextUrl.clone();
      paymentsUrl.pathname = "/payments";
      paymentsUrl.search = "";
      return NextResponse.redirect(paymentsUrl);
    }

    gateToken = await signGate(claims);
  }

  if (user && pathname === "/login") {
    const err = request.nextUrl.searchParams.get("error");
    if (err === "unauthorized" || err === "auth" || err === "no-email") {
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
        copyCookies(supabaseResponse, cleaned);
        clearSupabaseAuthCookies(cleaned, request.url);
        cleaned.cookies.set(GATE_COOKIE, "", gateCookieOptions(0));
        return cleaned;
      }
      return supabaseResponse;
    }

    const existing = await verifyGate(request.cookies.get(GATE_COOKIE)?.value);
    const email = user.email ? normalizeEmail(user.email) : "";
    const cached =
      existing && email && claimsMatchUser(existing, user.id, email)
        ? existing
        : null;
    const activity = cached ?? (await getUserActivity(user.id));
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = activity.is_active ? "/" : "/payments";
    return NextResponse.redirect(homeUrl);
  }

  if (!gateToken) return supabaseResponse;

  request.headers.set(GATE_HEADER, gateToken);
  const forwarded = NextResponse.next({ request });
  copyCookies(supabaseResponse, forwarded);
  forwarded.cookies.set(GATE_COOKIE, gateToken, gateCookieOptions());
  return forwarded;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
