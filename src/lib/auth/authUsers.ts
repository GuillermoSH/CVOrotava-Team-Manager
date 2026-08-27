import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeEmail } from "@/lib/auth/allowlist";

export type AuthUserLite = {
  id: string;
  email: string;
  last_sign_in_at: string | null;
};

export async function listAuthUsersByEmail(): Promise<
  Map<string, AuthUserLite>
> {
  const map = new Map<string, AuthUserLite>();
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error || !data?.users?.length) break;

    for (const u of data.users) {
      if (!u.email) continue;
      map.set(normalizeEmail(u.email), {
        id: u.id,
        email: normalizeEmail(u.email),
        last_sign_in_at: u.last_sign_in_at ?? null,
      });
    }

    if (data.users.length < perPage) break;
    page += 1;
  }

  return map;
}

export async function signOutAuthUserByEmail(email: string): Promise<void> {
  const users = await listAuthUsersByEmail();
  const match = users.get(normalizeEmail(email));
  if (!match) return;
  try {
    await supabaseAdmin.auth.admin.signOut(match.id, "global");
  } catch {
    /* best-effort */
  }
}
