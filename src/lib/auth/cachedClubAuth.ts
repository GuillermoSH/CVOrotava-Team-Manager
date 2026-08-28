import { cache } from "react";
import { supabaseServer } from "@/lib/supabase/server";
import { isEmailAllowlisted } from "@/lib/auth/allowlist";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserActivity } from "@/lib/auth/userActivity";

/** One getUser per RSC request (layout + admin gates share it). */
export const cachedAuthGetUser = cache(async () => {
  const supabase = await supabaseServer();
  return supabase.auth.getUser();
});

/** One allowlist round-trip per RSC request. */
export const cachedIsEmailAllowlisted = cache(async (email: string) =>
  isEmailAllowlisted(supabaseAdmin, email)
);

/** One users-row round-trip per RSC request. */
export const cachedGetUserActivity = cache(async (userId: string) =>
  getUserActivity(userId)
);
