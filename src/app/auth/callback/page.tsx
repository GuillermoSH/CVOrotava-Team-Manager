"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        router.replace("/login");
        return;
      }

      const { data: allowed } = await supabase
        .from("allowed_emails")
        .select("email")
        .eq("email", user.email)
        .maybeSingle();

      if (!allowed) {
        await supabase.auth.signOut();
        alert("Tu cuenta no está autorizada");
        router.replace("/login");
        return;
      }

      router.replace("/");
    };

    checkUser();
  }, [router]);

  return <p className="text-center mt-10 text-gray-400">Validando...</p>;
}
