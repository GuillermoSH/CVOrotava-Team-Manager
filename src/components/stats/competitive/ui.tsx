"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar } from "@fortawesome/free-solid-svg-icons";
import type { RivalTag } from "@/lib/stats/competitive/rivals";

/** Número que sube hasta su valor una sola vez (respeta «reducir movimiento»). */
export function useCountUp(target: number | null, ms = 900): number | null {
  const reduce = useReducedMotion();
  const [value, setValue] = useState<number | null>(reduce ? target : target === null ? null : 0);

  useEffect(() => {
    if (target === null || reduce) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      setValue(Math.round(target * (1 - (1 - p) ** 4)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, reduce]);

  return value;
}

/** true tras el primer pintado: sirve para que las barras crezcan desde 0. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  return mounted;
}

/** Dificultad de 1 a 5 estrellas (icono, con texto accesible). */
export function Stars({ value, className = "" }: Readonly<{ value: number | null; className?: string }>) {
  if (value === null) {
    return (
      <span className={`text-xs text-[var(--text-muted)] ${className}`} title="Todavía sin referencia">
        Sin datos
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-0.5 ${className}`}
      role="img"
      aria-label={`Dificultad ${value} de 5`}
      title={`Dificultad ${value} de 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <FontAwesomeIcon
          key={n}
          icon={faStar}
          aria-hidden
          className={`text-[0.7rem] ${n <= value ? "text-[var(--accent)]" : "text-[var(--text-muted)] opacity-30"}`}
        />
      ))}
    </span>
  );
}

/** Últimos resultados: V verde, D rojo, con letra (el color no es la única señal). */
export function FormPips({ results }: Readonly<{ results: ("W" | "L")[] }>) {
  return (
    <ol className="flex items-center gap-1.5" aria-label="Últimos resultados">
      {results.map((r, i) => (
        <li
          key={i}
          className={`inline-flex size-8 items-center justify-center rounded-lg text-xs font-bold ${
            r === "W"
              ? "bg-[var(--color-success-muted)] text-[var(--color-success)]"
              : "bg-[var(--color-danger-muted)] text-[color-mix(in_srgb,var(--color-danger)_72%,var(--text-primary))]"
          }`}
        >
          {r === "W" ? "V" : "D"}
        </li>
      ))}
    </ol>
  );
}

/** Medidor de 10 tramos (0–100). Los tramos se rellenan en cascada al montarse. */
export function Meter({
  value,
  tone = "var(--accent)",
  label,
  className = "",
}: Readonly<{ value: number | null; tone?: string; label: string; className?: string }>) {
  const mounted = useMounted();
  const reduce = useReducedMotion();
  const filled = value === null ? 0 : Math.round(Math.max(0, Math.min(100, value)) / 10);
  return (
    <div
      className={`flex gap-[3px] ${className}`}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value ?? undefined}
    >
      {Array.from({ length: 10 }, (_, i) => {
        const on = mounted && i < filled;
        return (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-[2px] bg-[var(--progress-segment)]"
            style={{
              backgroundColor: on ? tone : undefined,
              transition: reduce ? undefined : `background-color 380ms cubic-bezier(0.16,1,0.3,1) ${i * 55}ms`,
            }}
          />
        );
      })}
    </div>
  );
}

const TAG_META: Record<RivalTag, { label: string; className: string }> = {
  "a-batir": { label: "A batir", className: "bg-[var(--accent-muted)] text-[var(--accent)]" },
  "cuenta-pendiente": {
    label: "Cuenta pendiente",
    className: "bg-[var(--color-warning-muted)] text-[color-mix(in_srgb,var(--color-warning)_55%,var(--text-primary))]",
  },
  bestia: {
    label: "Bestia",
    className: "bg-[var(--color-danger-muted)] text-[color-mix(in_srgb,var(--color-danger)_72%,var(--text-primary))]",
  },
  asequible: { label: "Asequible", className: "bg-[var(--color-success-muted)] text-[var(--color-success)]" },
  nuevo: { label: "Rival nuevo", className: "bg-[var(--glass-surface)] text-[var(--text-secondary)]" },
  "sin-datos": { label: "Sin referencia", className: "bg-[var(--glass-surface)] text-[var(--text-secondary)]" },
};

export function TagChip({ tag }: Readonly<{ tag: RivalTag }>) {
  const meta = TAG_META[tag];
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  );
}
