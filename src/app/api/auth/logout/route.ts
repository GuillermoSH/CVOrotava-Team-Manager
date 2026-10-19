import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST() {
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
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  // 🚪 Cerrar sesión (Supabase limpia sus propias cookies automáticamente)
  await supabase.auth.signOut();
  cookieStore.set("cvorotava_gate", "", { path: "/", maxAge: 0 });

  // El cliente (fetch) navega a /login por su cuenta. Una redirección aquí apuntaba a
  // NEXT_PUBLIC_SITE_URL: si ese origen no es el de la app (otro puerto en local), fetch
  // la seguía a otro origen y fallaba por CORS con «Failed to fetch».
  return NextResponse.json({ ok: true });
}
