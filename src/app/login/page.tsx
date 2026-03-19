"use client";

import Image from "next/image";
import GoogleBtn from "@/components/ui/GoogleBtn";
import { motion } from "framer-motion";

export default function LoginPage() {
  return (
    <main className="relative flex items-center justify-center min-h-[100svh] overflow-hidden bg-[#050505]">
      {/* Background: ambient glowing orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="absolute top-1/4 left-1/4 w-[60vw] h-[60vw] md:w-[40vw] md:h-[40vw] bg-red-600/10 rounded-full blur-[140px] animate-pulse-slow mix-blend-screen" />
        <div className="absolute bottom-1/4 right-1/4 w-[50vw] h-[50vw] md:w-[35vw] md:h-[35vw] bg-rose-900/10 rounded-full blur-[120px] animate-pulse-slow mix-blend-screen" style={{ animationDelay: "3s" }} />
      </div>

      {/* Decorative Grid */}
      <div className="absolute inset-0 bg-[url('/assets/svgs/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-[0.03]" />

      {/* Login card container */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center w-full max-w-[400px] mx-4"
      >
        {/* Glow behind the card */}
        <div className="absolute -inset-1 bg-gradient-to-br from-red-500/20 to-red-900/0 rounded-3xl blur-2xl opacity-50" />

        <div className="relative w-full p-8 md:p-10 bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/5 shadow-2xl rounded-3xl flex flex-col items-center space-y-8">
          
          {/* Logo with Glow */}
          <div className="relative group">
            <div className="absolute -inset-4 bg-gradient-to-tr from-red-600/40 to-orange-500/10 rounded-full blur-xl opacity-60 group-hover:opacity-100 transition duration-700" />
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2, type: "spring", stiffness: 200 }}
              className="relative w-24 h-24 rounded-2xl border border-white/10 overflow-hidden shadow-[0_0_40px_rgba(220,38,38,0.15)] bg-black"
            >
              <Image
                src="/assets/imgs/voleipuerto_128x128.webp"
                alt="Logo Voleipuerto"
                layout="fill"
                objectFit="contain"
                className="scale-90"
                priority
              />
            </motion.div>
          </div>

          {/* Typography */}
          <div className="text-center space-y-2 w-full">
            <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-white/70">
              C.V. Orotava
            </h1>
            <p className="text-[15px] font-medium text-[var(--text-muted)]">
              Puerto de la Cruz
            </p>
            <div className="pt-2">
              <span className="inline-block px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-xs font-semibold text-red-400 uppercase tracking-widest">
                Dashboard
              </span>
            </div>
          </div>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-2" />

          {/* Action */}
          <div className="w-full flex flex-col items-center gap-4">
            <GoogleBtn />
            <p className="text-[11px] font-medium text-[var(--text-muted)] opacity-60">
              Acceso restringido a personal autorizado
            </p>
          </div>
          
        </div>
      </motion.div>
    </main>
  );
}
