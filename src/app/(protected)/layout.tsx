import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import AppShell from "@/components/layout/AppShell";
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
    redirect("/login?error=unauthorized");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("gender, role, user_name, is_active")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const isActive = isAdmin ? true : profile?.is_active !== false;

  const appUser = {
    id: user.id,
    email,
    user_name: profile?.user_name ?? email,
    gender: profile?.gender ?? null,
    role: profile?.role ?? null,
    isAdmin,
    isActive,
  };

  return (
    <UserProvider initialUser={appUser}>
      <SeasonProvider>
        <AppShell />
        <AmbientBackground />
        <main className="relative min-h-screen w-full px-4 pb-[calc(var(--bottom-nav-height)+1.5rem+env(safe-area-inset-bottom,0px))] pt-[calc(var(--mobile-top-height)+1rem)] md:ml-[var(--sidebar-width)] md:w-[calc(100%-var(--sidebar-width))] md:px-8 md:pb-12 md:pt-8 lg:px-10">
          {children}
        </main>
      </SeasonProvider>
    </UserProvider>
  );
}
