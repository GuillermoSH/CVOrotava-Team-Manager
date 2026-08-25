import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import Navbar from "@/components/layout/Navbar";
import AmbientBackground from "@/components/layout/AmbientBackground";
import { UserProvider } from "@/contexts/UserContext";
import { SeasonProvider } from "@/contexts/SeasonContext";
import {
  isEmailAllowlisted,
  normalizeEmail,
} from "@/lib/auth/allowlist";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components cannot always mutate cookies; middleware owns refresh.
          }
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) redirect("/login");

  // Fail closed: no email ⇒ no access (do not skip allowlist).
  if (!user.email) {
    try {
      await supabaseAdmin.auth.admin.signOut(user.id, "global");
    } catch {
      /* best-effort */
    }
    redirect("/login?error=no-email");
  }

  const email = normalizeEmail(user.email);
  const allowed = await isEmailAllowlisted(supabaseAdmin, email);

  if (!allowed) {
    try {
      await supabaseAdmin.auth.admin.signOut(user.id, "global");
    } catch {
      /* best-effort */
    }
    // Cookie clear may not stick in RSC; middleware also enforces + clears.
    redirect("/login?error=unauthorized");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("gender, role, user_name")
    .eq("id", user.id)
    .single();

  const appUser = {
    id: user.id,
    email,
    user_name: profile?.user_name ?? email,
    gender: profile?.gender ?? null,
    role: profile?.role ?? null,
    isAdmin: profile?.role === "admin",
  };

  return (
    <UserProvider initialUser={appUser}>
      <SeasonProvider>
        <Navbar />
        <AmbientBackground />
        <main className="relative min-h-screen pt-20 pb-8 px-4 md:px-6 flex justify-center">
          {children}
        </main>
      </SeasonProvider>
    </UserProvider>
  );
}
