"use client";

import { useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";

export type LeagueStandingRow = {
  id: string;
  position: number;
  team_name: string;
  normalized_name: string;
  is_our_team: boolean;
  played: number;
  won: number;
  lost: number;
  sets_for: number;
  sets_against: number;
  league_points: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  season: string;
  gender: "male" | "female";
  rows: LeagueStandingRow[];
  ourPosition: number | null;
};

export default function LeagueStandingsModal({
  isOpen,
  onClose,
  season,
  gender,
  rows,
  ourPosition,
}: Readonly<Props>) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const genderLabel = gender === "male" ? "M" : "F";
  const motionProps = reduceMotion
    ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, scale: 0.95, y: 10 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.95, y: 10 },
      };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="standings-modal-title"
            {...motionProps}
            className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--color-bg-elevated)] shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[var(--glass-border)] bg-[var(--glass-surface)] p-4">
              <div className="min-w-0">
                <h2
                  id="standings-modal-title"
                  className="text-xl font-bold text-[var(--text-primary)]"
                >
                  Clasificación final
                </h2>
                <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                  {season} · {genderLabel}
                  {ourPosition !== null && (
                    <span className="text-[var(--text-secondary)]">
                      {" "}
                      · Nuestra posición: {ourPosition}º
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--glass-surface-hover)] hover:text-[var(--text-primary)]"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <div className="overflow-x-auto overflow-y-auto p-4 sm:p-5">
              <table className="w-full min-w-[32rem] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-[var(--text-muted)]">
                    <th className="px-2 py-2">Pos</th>
                    <th className="px-2 py-2">Equipo</th>
                    <th className="px-2 py-2 text-right">PJ</th>
                    <th className="px-2 py-2 text-right">V</th>
                    <th className="px-2 py-2 text-right">D</th>
                    <th className="px-2 py-2 text-right">Sets</th>
                    <th className="px-2 py-2 text-right">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className={`border-t border-[var(--glass-border)] ${
                        r.is_our_team
                          ? "bg-[var(--accent-muted)]/40 font-semibold"
                          : ""
                      }`}
                    >
                      <td className="px-2 py-1.5 tabular-nums">{r.position}</td>
                      <td className="px-2 py-1.5">{r.team_name}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {r.played}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {r.won}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {r.lost}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {r.sets_for}–{r.sets_against}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {r.league_points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
