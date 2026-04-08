"use client";

import Image from "next/image";
import GoogleBtn from "@/components/ui/GoogleBtn";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faVolleyball } from "@fortawesome/free-solid-svg-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { useEffect, useState } from "react";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 }
  }
};

const authErrorMessage = (code: string | null): string | null => {
  switch (code) {
    case "unauthorized":
      return "Tu correo no está autorizado para acceder a esta aplicación. Si crees que es un error, contacta con un administrador.";
    case "auth":
      return "No se pudo completar el inicio de sesión. Inténtalo de nuevo.";
    case "no-email":
      return "Tu cuenta no tiene un correo asociado; no podemos verificar el acceso.";
    default:
      return null;
  }
};

export default function LoginPage() {
  const { theme } = useTheme();
  const light = theme === "light";
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setAuthError(authErrorMessage(params.get("error")));
    if (params.has("error")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, []);

  return (
    <main className="relative flex flex-col md:flex-row min-h-[100svh] overflow-hidden bg-[var(--color-bg)] text-[var(--text-primary)]">
      <div className="absolute top-4 right-4 z-20 md:top-6 md:right-6">
        <ThemeToggle />
      </div>

      {/* ── Background Effects ── */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div
          className={`absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full blur-[150px] mix-blend-screen ${
            light ? "bg-red-500/20" : "bg-red-600/15"
          }`}
        />
        <div
          className={`absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full blur-[150px] mix-blend-screen ${
            light ? "bg-orange-400/18" : "bg-orange-600/10"
          }`}
        />
        <div className="absolute inset-0 bg-[url('/assets/svgs/grid.svg')] bg-[size:40px_40px] [mask-image:linear-gradient(to_bottom,white,transparent)] opacity-[0.03]" />
      </div>

      {/* ── Left Side: Brand Showcase (Hidden on Mobile) ── */}
      <div
        className={`hidden md:flex flex-1 relative z-10 flex-col justify-between p-12 border-r border-[var(--glass-border)] backdrop-blur-3xl ${
          light
            ? "bg-gradient-to-br from-white/95 via-[var(--color-bg)] to-red-50/50"
            : "bg-gradient-to-br from-black/80 to-[#110505]/90"
        }`}
      >
        <div className="flex items-center gap-3">
           <FontAwesomeIcon icon={faVolleyball} className="text-red-500 text-2xl" />
           <span className="font-bold tracking-widest text-sm uppercase text-[var(--text-secondary)]">Team Manager Pro</span>
        </div>

        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          className="space-y-6 max-w-xl"
        >
          <h1 className="text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight">
            Gestiona el club <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">
              con precisión.
            </span>
          </h1>
          <p className="text-lg text-[var(--text-muted)] font-medium leading-relaxed max-w-md">
            Visualiza estadísticas en tiempo real, organiza pagos de jugadores y analiza los vídeos de los encuentros de forma centralizada.
          </p>
        </motion.div>

        <div className="flex items-center gap-4 text-sm text-[var(--text-muted)] mt-12">
           <div className="h-px bg-[var(--glass-border)] flex-1 max-w-[100px]" />
           <p className="uppercase tracking-widest text-xs font-semibold">C.V. Orotava - Puerto de la Cruz</p>
        </div>
      </div>

      {/* ── Right Side: Login Panel ── */}
      <div className="flex-[1_1_100%] md:flex-[0_0_450px] lg:flex-[0_0_550px] flex items-center justify-center p-6 relative z-10">
        
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
          }}
          className="w-full max-w-[380px] flex flex-col items-center"
        >
          {/* Logo */}
          <motion.div variants={itemVariants} className="relative group mb-10 mt-10 md:mt-0">
            <div className="absolute -inset-6 bg-gradient-to-t from-red-600/30 to-orange-400/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative w-28 h-28 rounded-[2rem] border border-[var(--glass-border)] overflow-hidden shadow-2xl bg-[var(--color-bg-elevated)] flex justify-center items-center">
              <Image
                src="/assets/imgs/voleipuerto_128x128.webp"
                alt="Logo Voleipuerto"
                layout="fill"
                objectFit="contain"
                className="scale-75 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                priority
              />
            </div>
          </motion.div>

          {/* Heading */}
          <motion.div variants={itemVariants} className="text-center space-y-3 mb-10 w-full">
            <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              Bienvenido de nuevo
            </h2>
            <p className="text-[15px] font-medium text-[var(--text-muted)]">
               Inicia sesión para acceder al panel de control.
            </p>
          </motion.div>

          {authError && (
            <motion.div
              variants={itemVariants}
              role="alert"
              className="mb-6 w-full rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-left text-sm text-red-800 dark:text-red-100"
            >
              {authError}
            </motion.div>
          )}

          {/* Auth Button */}
          <motion.div variants={itemVariants} className="w-full relative">
             <div className="absolute -inset-1 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-red-500/20 rounded-2xl blur-lg opacity-50" />
             <div className="relative">
               <GoogleBtn />
             </div>
          </motion.div>

          {/* Footer Info */}
          <motion.div variants={itemVariants} className="mt-10 text-center w-full">
             <div className="flex items-center justify-center gap-3">
               <div className="h-[1px] w-8 bg-[var(--glass-border)]" />
               <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest bg-[var(--color-bg-elevated)] px-3 py-1 rounded-full border border-[var(--glass-border)]">
                 Entorno Privado
               </span>
               <div className="h-[1px] w-8 bg-[var(--glass-border)]" />
             </div>
          </motion.div>
        </motion.div>

      </div>
    </main>
  );
}
