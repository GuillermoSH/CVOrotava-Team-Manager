import { cache } from "react";
import { redirect } from "next/navigation";
import { normalizeEmail } from "@/lib/auth/allowlist";
import {
  cachedAuthGetUser,
  cachedGetUserActivity,
  cachedIsEmailAllowlisted,
} from "@/lib/auth/cachedClubAuth";
import {
  claimsMatchUser,
  readGateFromRequest,
  type GateClaims,
} from "@/lib/auth/gate";
import type { AllowedUser } from "@/lib/auth/require-allowed-user";

export type LoadAppUserResult =
  | { ok: true; user: AllowedUser }
  | { ok: false; reason: "unauthenticated" }
  | { ok: false; reason: "no-email"; userId: string }
  | { ok: false; reason: "unauthorized"; userId: string };

function userFromGate(userId: string, claims: GateClaims): AllowedUser {
  return {
    id: userId,
    email: claims.email,
    isActive: claims.is_active,
    isAdmin: claims.isAdmin,
    role: claims.role,
    user_name: claims.user_name,
    gender: claims.gender,
  };
}

/**
 * Session + club profile for protected RSC. Deduped per request with cache()
 * and the middleware gate so layout + page share one getUser.
 */
export const loadAppUser = cache(async (): Promise<LoadAppUserResult> => {
  const {
    data: { user },
    error,
  } = await cachedAuthGetUser();

  if (error || !user) return { ok: false, reason: "unauthenticated" };
  if (!user.email) return { ok: false, reason: "no-email", userId: user.id };

  const email = normalizeEmail(user.email);
  const gate = await readGateFromRequest();
  if (gate && claimsMatchUser(gate, user.id, email)) {
    return { ok: true, user: userFromGate(user.id, gate) };
  }

  const allowed = await cachedIsEmailAllowlisted(email);
  if (!allowed) return { ok: false, reason: "unauthorized", userId: user.id };

  const activity = await cachedGetUserActivity(user.id);
  return {
    ok: true,
    user: {
      id: user.id,
      email,
      isActive: activity.is_active,
      isAdmin: activity.isAdmin,
      role: activity.role,
      user_name: activity.user_name ?? email,
      gender: activity.gender,
    },
  };
});

export async function requireAppUser(): Promise<AllowedUser> {
  const result = await loadAppUser();
  if (!result.ok) redirect("/login");
  return result.user;
}
