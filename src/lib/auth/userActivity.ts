import { supabaseAdmin } from "@/lib/supabase/admin";

export type UserActivityProfile = {
  is_active: boolean;
  role: string | null;
  isAdmin: boolean;
  user_name: string | null;
  gender: "male" | "female" | null;
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
    .select("is_active, role, user_name, gender")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return {
      is_active: true,
      role: null,
      isAdmin: false,
      user_name: null,
      gender: null,
    };
  }

  const isAdmin = data.role === "admin";
  // Admins are never locked out by inactivity.
  const is_active = isAdmin ? true : data.is_active !== false;
  const gender =
    data.gender === "male" || data.gender === "female" ? data.gender : null;

  return {
    is_active,
    role: data.role ?? null,
    isAdmin,
    user_name: data.user_name ?? null,
    gender,
  };
}

/** Paths an inactive member may still open (pages). */
export function isInactiveAllowedPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  return path === "/payments";
}
