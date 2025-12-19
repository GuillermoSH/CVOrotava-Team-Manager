"use client";

import Image from "next/image";
import GoogleBtn from "@/components/ui/GoogleBtn";
import { motion } from "framer-motion";

export default function LoginPage() {
  return (
    <main className="relative flex items-center justify-center min-h-[100svh] overflow-hidden bg-[#1C1C1A]">
      {/* 🎨 Fondo: degradado dinámico rojizo con brillo */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#D7263D_0%,transparent_60%),radial-gradient(circle_at_80%_80%,#3a3a38_0%,transparent_70%)] animate-pulse-slow opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#1C1C1A]/95 via-[#2A2A28]/90 to-[#1C1C1A]/95 backdrop-blur-3xl" />

      {/* 🪟 Tarjeta de login */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center w-full max-w-[360px] p-8 space-y-6 rounded-2xl bg-white/2 border border-white/20 shadow-[0_0_25px_rgba(255,255,255,0.1)] backdrop-blur-2xl"
      >
        {/* 🏐 Logo */}
        <div className="relative w-24 h-24 rounded-full border border-white/30 overflow-hidden bg-white/2 shadow-inner">
          <Image
            src="/assets/imgs/voleipuerto_128x128.webp"
            alt="Logo Voleipuerto"
            width={96}
            height={96}
            priority
          />
        </div>

        {/* 🏷️ Títulos */}
        <div className="text-center space-y-1">
          <h1 className="font-bold text-white text-xl">
            C.V. Orotava - Pto. de la Cruz
          </h1>
          <h2 className="text-white/70 text-sm">
            Cuadro de mando y gestión
          </h2>
        </div>

        <div className="w-full border-t border-white/20" />

        {/* 🔐 Botón Google */}
        <div className="w-full">
          <GoogleBtn />
        </div>

        {/* 🧾 Nota */}
        <p className="text-xs text-center text-white/50 mt-2">
          Acceso restringido a personal autorizado
        </p>
      </motion.div>
    </main>
  );
}
