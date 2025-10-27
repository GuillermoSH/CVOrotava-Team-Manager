import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import Navbar from "@/components/layout/Navbar";
import { UserProvider } from "@/contexts/UserContext";

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
        get: (key) => cookieStore.get(key)?.value,
        set: (key, value, options) => {
          cookieStore.set({ name: key, value, ...options });
        },
        remove: (key, options) => {
          cookieStore.set({ name: key, value: "", ...options });
        },
      },
    }
  );

  // 1️⃣ Obtener sesión del usuario
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2️⃣ Obtener perfil de la tabla users
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

  // 3️⃣ Pasar el usuario precargado al contexto
  return (
    <UserProvider initialUser={appUser}>
      <Navbar />
      <main className="min-h-screen bg-[url(/assets/svgs/circle-scatter-RB-shape.svg)] bg-center bg-cover bg-fixed pt-16 pb-6 px-3 md:px-6 flex justify-center">
        {children}
      </main>
    </UserProvider>
  );
}
