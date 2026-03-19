"use client";

import { supabase } from "@/lib/supabase/client";
import Image from "next/image";

export default function GoogleBtn() {
  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });

    if (error) console.error("Error iniciando sesión:", error.message);
  };

  return (
    <button
      onClick={handleLogin}
      className="group w-full flex items-center justify-center gap-3 h-12 px-5 border border-white/10 rounded-2xl bg-white hover:bg-gray-100 transition-all duration-300 shadow-[0_4px_14px_0_rgba(255,255,255,0.05)] hover:shadow-[0_6px_20px_rgba(255,255,255,0.1)] active:scale-[0.98]"
    >
      <div className="relative w-[22px] h-[22px]">
        <Image
          src="/assets/svgs/google-logo.svg"
          alt="Google"
          layout="fill"
        />
      </div>
      <span className="text-[15px] font-semibold text-gray-900 tracking-wide">
        Continuar con Google
      </span>
    </button>
  );
}
