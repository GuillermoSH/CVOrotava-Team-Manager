"use client";

import { useMemo } from "react";
import {
  Particles,
  ParticlesProvider,
  type IParticlesProps,
} from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { useReducedMotion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";

function LoginParticlesCanvas() {
  const { theme } = useTheme();
  const light = theme === "light";

  const options = useMemo<NonNullable<IParticlesProps["options"]>>(
    () => ({
      fullScreen: { enable: false },
      background: { color: { value: "transparent" } },
      fpsLimit: 48,
      detectRetina: true,
      particles: {
        number: {
          value: light ? 42 : 36,
          density: { enable: true, width: 900, height: 900 },
        },
        color: {
          value: light
            ? ["#b91c1c", "#d01e1e", "#3f3f50"]
            : ["#e62222", "#ff5a45", "#f0f0f5"],
        },
        shape: { type: "circle" },
        opacity: {
          // Light bg needs more opacity; dark already reads fine
          value: { min: light ? 0.28 : 0.1, max: light ? 0.58 : 0.4 },
          animation: {
            enable: true,
            speed: 0.35,
            sync: false,
            startValue: "random",
          },
        },
        size: {
          value: { min: light ? 1.6 : 1.2, max: light ? 3.8 : 3.2 },
        },
        move: {
          enable: true,
          speed: { min: 0.15, max: 0.55 },
          direction: "none",
          random: true,
          straight: false,
          outModes: { default: "out" },
        },
        links: { enable: false },
      },
      interactivity: {
        detectsOn: "canvas",
        events: {
          onHover: { enable: false },
          onClick: { enable: false },
          resize: { enable: true },
        },
      },
    }),
    [light]
  );

  return (
    <Particles
      id={`login-particles-${light ? "light" : "dark"}`}
      className="absolute inset-0 h-full w-full"
      options={options}
    />
  );
}

/** Soft floating dots for the login stage. Skipped when reduced motion is on. */
export default function LoginParticles() {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
    >
      <ParticlesProvider init={loadSlim}>
        <LoginParticlesCanvas />
      </ParticlesProvider>
    </div>
  );
}
