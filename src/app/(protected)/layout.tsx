import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import AmbientBackground from "@/components/layout/AmbientBackground";
import { UserProvider, type AppUser } from "@/contexts/UserContext";
import { SeasonProvider } from "@/contexts/SeasonContext";
import {
  NavPendingProvider,
  PendingMain,
} from "@/contexts/NavPendingContext";
import { loadAppUser } from "@/lib/auth/loadAppUser";
import { listSeasons } from "@/lib/seasons/listSeasons";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentSeason } from "@/utils/getCurrentSeason";

function toUserRole(
  role: string | null
): NonNullable<AppUser>["role"] {
  if (role === "admin" || role === "coach" || role === "player") return role;
  return null;
}

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await loadAppUser();

  if (!result.ok) {
    if (result.reason === "unauthenticated") redirect("/login");
    try {
      await supabaseAdmin.auth.admin.signOut(result.userId, "global");
    } catch {
      /* best-effort */
    }
    if (result.reason === "no-email") redirect("/login?error=no-email");
    redirect("/login?error=unauthorized");
  }

  const { user } = result;
  const appUser: NonNullable<AppUser> = {
    id: user.id,
    email: user.email,
    user_name: user.user_name,
    gender: user.gender,
    role: toUserRole(user.role),
    isAdmin: user.isAdmin,
    isActive: user.isActive,
  };

  let seasons: string[] = [getCurrentSeason()];
  try {
    seasons = await listSeasons();
  } catch (err) {
    console.error("listSeasons failed:", err);
  }

  return (
    <UserProvider initialUser={appUser}>
      <SeasonProvider initialSeasons={seasons}>
        <NavPendingProvider>
          <AppShell />
          <AmbientBackground />
          <main className="relative min-h-screen w-full px-4 pb-[calc(var(--bottom-nav-height)+1.5rem+env(safe-area-inset-bottom,0px))] pt-[calc(var(--mobile-top-height)+1rem)] md:ml-[var(--sidebar-width)] md:w-[calc(100%-var(--sidebar-width))] md:px-8 md:pb-12 md:pt-8 lg:px-10">
            <PendingMain>{children}</PendingMain>
          </main>
        </NavPendingProvider>
      </SeasonProvider>
    </UserProvider>
  );
}
