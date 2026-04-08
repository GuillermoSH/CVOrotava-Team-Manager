"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // ✅ Intercambiar el código de Google por una sesión activa
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);

        if (error) {
          console.error("❌ Error al intercambiar el código:", error.message);
          router.replace("/login");
          return;
        }

        // ✅ Obtener el usuario una vez hay sesión
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user?.email) {
          router.replace("/login");
          return;
        }

        // ✅ Comprobar email permitido
        const { data: allowed } = await supabase
          .from("allowed_emails")
          .select("email")
          .eq("email", user.email)
          .maybeSingle();

        if (!allowed) {
          await supabase.auth.signOut();
          router.replace("/login?error=unauthorized");
          return;
        }

        // ✅ Redirigir al dashboard
        router.replace("/");
      } catch (err) {
        console.error("💥 Error inesperado en callback:", err);
        router.replace("/login");
      }
    };

    handleAuthCallback();
  }, [router]);

  return <p className="text-center mt-10 text-gray-400">Validando acceso...</p>;
}
