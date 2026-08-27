import { supabaseAdmin } from "@/lib/supabase/admin";

export type UserActivityProfile = {
  is_active: boolean;
  role: string | null;
  isAdmin: boolean;
};

/**
 * Club activity from public.users.
 * Missing profile → treat as active (pending first profile create).
 */
export async function getUserActivity(
  userId: string
): Promise<UserActivityProfile> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("is_active, role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return { is_active: true, role: null, isAdmin: false };
  }

  const isAdmin = data.role === "admin";
  // Admins are never locked out by inactivity.
  const is_active = isAdmin ? true : data.is_active !== false;

  return {
    is_active,
    role: data.role ?? null,
    isAdmin,
  };
}

/** Paths an inactive member may still open (pages). */
export function isInactiveAllowedPath(pathname: string): boolean {
  if (pathname === "/payments" || pathname.startsWith("/payments/")) {
    return true;
  }
  return false;
}
