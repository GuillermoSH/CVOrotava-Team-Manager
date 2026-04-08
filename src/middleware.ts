import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Crear cliente de Supabase con la API moderna getAll/setAll
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: No ejecutar código entre createServerClient y getUser()
  // ya que podría invalidar la sesión.
  // Usar getUser() en lugar de getSession() para verificar contra el servidor.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Las rutas de API (excepto /api/auth) gestionan su propia autenticación.
  // No las bloqueamos aquí para evitar interferir con los fetches del cliente.
  const isApiRoute =
    pathname.startsWith("/api/") && !pathname.startsWith("/api/auth");

  if (isApiRoute) {
    return supabaseResponse;
  }

  // Rutas públicas de página que no requieren autenticación
  const isPublicPath =
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/assets");

  // Si no hay sesión y la ruta no es pública → redirigir al login
  if (!user && !isPublicPath) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // Si hay sesión y el usuario intenta acceder al login → ir al dashboard,
  // salvo cuando venimos de un fallo de auth (p. ej. email no permitido): debe ver el mensaje.
  if (user && pathname === "/login") {
    const err = request.nextUrl.searchParams.get("error");
    if (err === "unauthorized" || err === "auth" || err === "no-email") {
      return supabaseResponse;
    }
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    return NextResponse.redirect(homeUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Excluir archivos estáticos de Next.js y metadatos
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
