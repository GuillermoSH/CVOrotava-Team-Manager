import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeEmail } from "@/lib/auth/allowlist";
import { listAuthUsersByEmail } from "@/lib/auth/authUsers";
import type { AllowedEmailRow } from "@/lib/auth/allowedEmails";

export async function listAllowedEmails(): Promise<AllowedEmailRow[]> {
  const { data, error } = await supabaseAdmin
    .from("allowed_emails")
    .select("email, created_at")
    .order("email", { ascending: true });

  if (error) throw new Error(error.message);

  const authByEmail = await listAuthUsersByEmail();
  const authIds = [...authByEmail.values()].map((u) => u.id);
  const profilesById = new Map<
    string,
    {
      user_name: string | null;
      role: AllowedEmailRow["role"];
      gender: AllowedEmailRow["gender"];
      is_active: boolean | null;
    }
  >();

  if (authIds.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from("users")
      .select("id, user_name, role, gender, is_active")
      .in("id", authIds);
    for (const p of profiles ?? []) {
      const gender =
        p.gender === "male" || p.gender === "female" ? p.gender : null;
      profilesById.set(p.id, {
        user_name: p.user_name ?? null,
        role: (p.role as AllowedEmailRow["role"]) ?? null,
        gender,
        is_active: typeof p.is_active === "boolean" ? p.is_active : null,
      });
    }
  }

  return (data ?? []).map((row) => {
    const email = normalizeEmail(String(row.email ?? ""));
    const authUser = authByEmail.get(email);
    const profile = authUser ? profilesById.get(authUser.id) : undefined;
    return {
      email,
      created_at: row.created_at ?? null,
      user_id: authUser?.id ?? null,
      user_name: profile?.user_name ?? null,
      role: profile?.role ?? null,
      gender: profile?.gender ?? null,
      is_active: profile?.is_active ?? null,
      last_sign_in_at: authUser?.last_sign_in_at ?? null,
    };
  });
}
