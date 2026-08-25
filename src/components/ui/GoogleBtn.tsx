"use client";

import { supabase } from "@/lib/supabase/client";
import Image from "next/image";
import { useState } from "react";

export default function GoogleBtn() {
  const [busy, setBusy] = useState(false);

  const handleLogin = async () => {
    if (busy) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });

    if (error) {
      console.error("Error iniciando sesión:", error.message);
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogin}
      disabled={busy}
      className="group flex h-12 w-full items-center justify-center gap-3 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-white px-5 text-gray-900 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.06)] transition-[transform,background-color,box-shadow] duration-200 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] active:scale-[0.985] disabled:cursor-wait disabled:opacity-70"
    >
      <Image
        src="/assets/svgs/google-logo.svg"
        alt=""
        width={20}
        height={20}
        aria-hidden
      />
      <span className="text-[15px] font-semibold tracking-[-0.01em]">
        {busy ? "Conectando…" : "Continuar con Google"}
      </span>
    </button>
  );
}
