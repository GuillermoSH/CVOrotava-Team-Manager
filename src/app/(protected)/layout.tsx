import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import Navbar from "@/components/layout/Navbar";
import { UserProvider } from "@/contexts/UserContext";
import { SeasonProvider } from "@/contexts/SeasonContext";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  // ✅ MODO SOLO LECTURA
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        // 🚫 NO incluir set/remove aquí (causa el error)
      },
    }
  );

  // 1️⃣ Verificar usuario
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) redirect("/login");

  // 2️⃣ Obtener perfil del usuario
  const { data: profile } = await supabase
    .from("users")
    .select("gender, role")
    .eq("id", user.id)
    .single();

  const appUser = {
    id: user.id,
    email: user.email!,
    gender: profile?.gender ?? null,
    role: profile?.role ?? null,
    isAdmin: profile?.role === "admin",
  };

  // 3️⃣ Render protegido
  return (
    <UserProvider initialUser={appUser}>
      <SeasonProvider>
        <Navbar />
        <main className="min-h-screen bg-[url(/assets/svgs/circle-scatter-RB-shape.svg)] bg-center bg-cover bg-fixed pt-16 pb-6 px-3 md:px-6 flex justify-center">
          {children}
        </main>
      </SeasonProvider>
    </UserProvider>
  );
}
