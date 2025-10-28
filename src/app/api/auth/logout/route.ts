import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();

  // ✅ Tipado moderno recomendado por @supabase/ssr
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (
          name: string,
          value: string,
          options?: CookieOptions
        ) => {
          cookieStore.set({
            name,
            value,
            ...options,
          });
        },
        remove: (name: string, options?: CookieOptions) => {
          cookieStore.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  // 🚪 Cerrar sesión correctamente
  await supabase.auth.signOut();

  // 🧹 Limpiar cookies de sesión
  cookieStore.delete("sb-access-token");
  cookieStore.delete("sb-refresh-token");

  // 🔁 Redirigir al login
  return NextResponse.redirect(
    new URL(
      "/login",
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    )
  );
}
