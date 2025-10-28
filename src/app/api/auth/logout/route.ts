import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * 🔐 Cierra la sesión del usuario
 * - Elimina las cookies de Supabase
 * - Redirige de vuelta al login
 */
export async function POST() {
  const cookieStore = await cookies();

  // ✅ Crear cliente con permisos de escritura (route handlers sí lo permiten)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: any) => {
          cookieStore.set({ name, value, ...options });
        },
        remove: (name: string, options: any) => {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );

  // 🚪 Cerrar sesión
  await supabase.auth.signOut();

  // 🧹 Eliminar cookies manualmente (seguridad extra)
  cookieStore.delete("sb-access-token");
  cookieStore.delete("sb-refresh-token");

  // 🔁 Redirigir al login (puedes cambiarlo si lo prefieres)
  return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
}
