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

  // 3️⃣ Render protegido
  return (
    <UserProvider initialUser={appUser}>
      <SeasonProvider>
        <Navbar />

        {/* Global Background (Option A) */}
        <div className="fixed inset-0 pointer-events-none z-[-1] bg-[#09090b] overflow-hidden">
          {/* Orbs */}
          <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-red-900/10 blur-[130px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-900/10 blur-[140px]" />
          <div className="absolute top-[40%] left-[20%] w-[30vw] h-[30vw] rounded-full bg-blue-900/5 blur-[120px]" />
          
          {/* Subtle noise/grain overlay */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
        </div>

        <main className="relative z-0 min-h-screen pt-20 pb-8 px-4 md:px-6 flex justify-center">
          {children}
        </main>
      </SeasonProvider>
    </UserProvider>
  );
}
