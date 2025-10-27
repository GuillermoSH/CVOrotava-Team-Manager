"use client";

import { supabase } from "@/lib/supabase/client";
import Image from "next/image";

export default function GoogleBtn() {
  const handleLogin = async () => {
    const redirectUrl =
      process.env.NODE_ENV === "development"
        ? "http://localhost:3000/auth/callback"
        : "https://cvorotava-team-manager.vercel.app/auth/callback";

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
        queryParams: { prompt: "select_account" },
      },
    });

    if (error) console.error("Error iniciando sesión:", error.message);
  };

  return (
    <button
      onClick={handleLogin}
      className="w-full text-black flex items-center justify-center h-10 px-[12px] border border-[#747775] rounded-full py-2 bg-white hover:bg-gray-50"
    >
      <Image
        src="/assets/svgs/google-logo.svg"
        alt="Google"
        width={20}
        height={20}
      />
      <span className="ms-2.5 text-base font-medium">
        Iniciar sesión con Google
      </span>
    </button>
  );
}
