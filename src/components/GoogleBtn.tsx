"use client";

import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";

export default function GoogleBtn() {
  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) console.error("Error logging in:", error.message);
  };

  return (
    <button
      onClick={handleLogin}
      className="w-full focus:border-none focus:outline-none focus:ring-2 focus:ring-royalblue-500 flex items-center justify-center h-10 px-[12px] border border-[#747775] rounded-full py-2 bg-white hover:bg-gray-50"
    >
      <Image
        src="/assets/svgs/google-logo.svg"
        alt="Google"
        width={20}
        height={20}
      />
      <span className="ms-2.5 text-base font-medium">Iniciar sesión con Google</span>
    </button>
  );
}