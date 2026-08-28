"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import GoogleBtn from "@/components/ui/GoogleBtn";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;
const FLIGHT_MS = 0.9;

const LoginParticles = dynamic(() => import("@/components/ui/LoginParticles"), {
  ssr: false,
});

type Phase = "cover" | "reveal" | "done";

const authErrorMessage = (code: string | null): string | null => {
  switch (code) {
    case "unauthorized":
      return "Tu correo no está autorizado. Si crees que es un error, contacta con un administrador.";
    case "auth":
      return "No se pudo completar el inicio de sesión. Inténtalo de nuevo.";
    case "no-email":
      return "Tu cuenta no tiene un correo asociado; no podemos verificar el acceso.";
    default:
      return null;
  }
};

function ClubLogo({ size }: { size: "splash" | "header" }) {
  const dim = size === "splash" ? "h-36 w-36 sm:h-44 sm:w-44" : "h-16 w-16";
  const img = size === "splash" ? 176 : 64;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--color-bg-elevated)] ${dim}`}
    >
      <Image
        src="/assets/imgs/voleipuerto_256x256.webp"
        alt="Escudo Voleipuerto"
        width={img}
        height={img}
        className="h-full w-full object-contain p-2"
        priority
      />
    </div>
  );
}

export default function LoginPage() {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("cover");
  const [authError, setAuthError] = useState<string | null>(null);

  const uncovered = phase !== "cover";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setAuthError(authErrorMessage(params.get("error")));
    if (params.has("error")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      setPhase("done");
      return;
    }
    const hold = window.setTimeout(() => setPhase("reveal"), 700);
    return () => window.clearTimeout(hold);
  }, [reduceMotion]);

  return (
    <LayoutGroup>
      <main className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-[var(--color-bg)] px-6 py-10 text-[var(--text-primary)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 18%, var(--accent-muted), transparent 70%)",
          }}
        />
        {uncovered && <LoginParticles />}

        <div className="absolute top-4 right-4 z-30 md:top-6 md:right-6">
          <ThemeToggle variant="expanded" />
        </div>

        {/* Login already in final layout — the cover sits on top until the logo lands */}
        <div
          className="relative z-10 flex w-full max-w-[360px] flex-col items-center"
          aria-hidden={!uncovered}
          style={{ pointerEvents: uncovered ? "auto" : "none" }}
        >
          <div className="mb-8 flex flex-col items-center gap-5">
            {uncovered ? (
              <motion.div
                layoutId="club-logo"
                transition={{ layout: { duration: FLIGHT_MS, ease: EASE } }}
              >
                <ClubLogo size="header" />
              </motion.div>
            ) : (
              <div className="h-16 w-16" aria-hidden />
            )}

            <div className="text-center">
              <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-[var(--text-primary)] sm:text-[2rem]">
                C.V. Orotava
              </h1>
              <p className="mt-1.5 text-sm font-medium text-[var(--text-secondary)]">
                Team Manager
              </p>
            </div>
          </div>

          <p className="mb-8 text-center text-sm leading-relaxed text-[var(--text-muted)]">
            El portal donde encontrarás toda la información de la temporada
          </p>

          {authError && (
            <div
              role="alert"
              className="mb-5 w-full rounded-[var(--radius-md)] border border-[var(--color-danger)]/35 bg-[var(--color-danger-muted)] px-4 py-3 text-left text-sm text-[var(--payment-badge-pending-text)]"
            >
              {authError}
            </div>
          )}

          <div className="w-full">
            <GoogleBtn />
          </div>

          <p className="mt-10 text-center text-xs text-[var(--text-muted)]">
            Acceso privado · La Orotava, Tenerife
          </p>
        </div>

        {/* Solid cover: logo tapando el login; al revelar solo se desvanece el velo (el logo ya voló fuera) */}
        {phase === "cover" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--color-bg)]">
            <motion.div
              layoutId="club-logo"
              transition={{ layout: { duration: FLIGHT_MS, ease: EASE } }}
            >
              <ClubLogo size="splash" />
            </motion.div>
          </div>
        )}

        {phase === "reveal" && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 bg-[var(--color-bg)]"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: FLIGHT_MS, ease: EASE }}
            onAnimationComplete={() => setPhase("done")}
          />
        )}
      </main>
    </LayoutGroup>
  );
}
