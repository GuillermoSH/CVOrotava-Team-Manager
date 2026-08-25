import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/** Canonical form for allowlist comparisons (Google emails are case-insensitive). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Authoritative allowlist check via service-role (or unrestricted) client.
 * Compares normalized emails in memory so casing / LIKE wildcards cannot bypass
 * or falsely deny. Fine for a club-sized allowlist.
 */
export async function isEmailAllowlisted(
  supabase: SupabaseClient,
  email: string
): Promise<boolean> {
  const normalized = normalizeEmail(email);
  const { data, error } = await supabase.from("allowed_emails").select("email");

  if (error) {
    console.error("allowed_emails lookup failed:", error.message);
    return false; // fail closed
  }

  return (data ?? []).some(
    (row) => normalizeEmail(String(row.email ?? "")) === normalized
  );
}

/** Clear every Supabase auth cookie on a concrete response (Route Handler redirects). */
export function clearSupabaseAuthCookies(response: NextResponse, requestUrl: string) {
  const hostname = new URL(requestUrl).hostname;
  const projectRef =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.match(
      /https?:\/\/([a-z0-9-]+)\.supabase\.co/i
    )?.[1] ?? null;

  const names = new Set<string>([
    "sb-access-token",
    "sb-refresh-token",
    ...(projectRef
      ? [
          `sb-${projectRef}-auth-token`,
          `sb-${projectRef}-auth-token-code-verifier`,
        ]
      : []),
  ]);

  for (const cookie of response.cookies.getAll()) {
    if (cookie.name.startsWith("sb-") && cookie.name.includes("auth-token")) {
      names.add(cookie.name);
    }
  }

  const expire = {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  } as const;

  for (const name of names) {
    response.cookies.set(name, "", expire);
    if (hostname && hostname !== "localhost") {
      response.cookies.set(name, "", { ...expire, domain: hostname });
    }
  }
}
