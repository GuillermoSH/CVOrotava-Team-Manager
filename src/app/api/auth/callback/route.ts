import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  // 🔒 Si no viene el código de OAuth, redirigimos
  if (!code) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const supabase = await supabaseServer();

  // 1️⃣ Intercambiar el código por una sesión segura en el servidor
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("❌ Error intercambiando código:", error);
    return NextResponse.redirect(new URL("/login?error=auth", request.url));
  }

  // 2️⃣ Obtener el usuario autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    console.error("❌ Usuario sin email");
    return NextResponse.redirect(new URL("/login?error=no-email", request.url));
  }

  // 3️⃣ Verificar si el email está permitido
  const { data: allowed } = await supabase
    .from("allowed_emails")
    .select("email")
    .eq("email", user.email)
    .maybeSingle();

  if (!allowed) {
    await supabase.auth.signOut();
    console.warn(`🚫 Acceso denegado para ${user.email}`);
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url));
  }

  // 4️⃣ Redirigir al dashboard o raíz protegida
  return NextResponse.redirect(new URL("/", request.url));
}
