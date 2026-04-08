import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import Navbar from "@/components/layout/Navbar";
import AmbientBackground from "@/components/layout/AmbientBackground";
import { UserProvider } from "@/contexts/UserContext";
import { SeasonProvider } from "@/contexts/SeasonContext";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  // ✅ API moderna con getAll/setAll (sin deprecation warnings)
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
            // En Server Components el set puede lanzar si la respuesta ya fue enviada.
            // El middleware se encarga de refrescar cookies, así que es seguro ignorarlo aquí.
          }
        },
      },
    }
  );

  // 1️⃣ Verificar usuario contra el servidor (más seguro que getSession)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) redirect("/login");

  // 2️⃣ Verificación secundaria: comprobar que el email sigue en la lista permitida
  // Esto protege contra el caso en que se elimine a alguien de allowed_emails
  // después de que ya tuviese una sesión activa.
  if (user.email) {
    const { data: allowed } = await supabase
      .from("allowed_emails")
      .select("email")
      .eq("email", user.email)
      .maybeSingle();

    if (!allowed) {
      await supabase.auth.signOut();
      redirect("/login?error=unauthorized");
    }
  }

  // 3️⃣ Obtener perfil del usuario
  const { data: profile } = await supabase
    .from("users")
    .select("gender, role, user_name")
    .eq("id", user.id)
    .single();

  const appUser = {
    id: user.id,
    email: user.email!,
    user_name: profile?.user_name ?? user.email!,
    gender: profile?.gender ?? null,
    role: profile?.role ?? null,
    isAdmin: profile?.role === "admin",
  };

  // 4️⃣ Render protegido
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
