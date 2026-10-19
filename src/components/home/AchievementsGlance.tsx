"use client";

import { useMemo } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faMedal } from "@fortawesome/free-solid-svg-icons";
import type { Achievement } from "@/lib/stats/competitive/achievements";
import { newlyUnlocked } from "@/lib/stats/competitive/achievementsSeen";
import { usePref } from "@/lib/usePref";
import { fullDate } from "@/components/stats/competitive/format";
import { ACHIEVEMENT_ICONS, TIER_LABEL } from "@/components/stats/competitive/AchievementsPanel";
import { Meter } from "@/components/stats/competitive/ui";

const SHOWN = 3;

export default function AchievementsGlance({
  achievements,
  season,
  gender,
}: Readonly<{ achievements: Achievement[]; season: string; gender: string }>) {
  // Misma clave que la pestaña Versus: lo que ya viste allí deja de salir como «Nuevo».
  const [rawSeen] = usePref<string>(`cvorotava-achievements-seen:${season}:${gender}`, (raw) => raw ?? "");

  const unlocked = useMemo(
    () =>
      achievements
        .filter((a) => a.unlocked)
        .sort((a, b) => (b.unlockedOn ?? "").localeCompare(a.unlockedOn ?? "")),
    [achievements]
  );
  const next = useMemo(
    () =>
      achievements
        .filter((a) => !a.unlocked && a.progress)
        .sort(
          (a, b) => b.progress!.value / b.progress!.target - a.progress!.value / a.progress!.target
        )[0],
    [achievements]
  );
  const fresh = useMemo(() => {
    let seen: string[] | null = null;
    try {
      const parsed: unknown = rawSeen ? JSON.parse(rawSeen) : null;
      seen = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : null;
    } catch {
      seen = null;
    }
    return new Set(
      newlyUnlocked(
        unlocked.map((a) => a.id),
        seen
      )
    );
  }, [rawSeen, unlocked]);

  if (achievements.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Logros</h2>
        <Link
          href="/stats"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          Ver todos
          <FontAwesomeIcon icon={faArrowRight} className="text-xs" aria-hidden />
        </Link>
      </div>

      {unlocked.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">Todavía no hay logros desbloqueados esta temporada.</p>
      ) : (
        <ul className="divide-y divide-[var(--glass-border)] border-y border-[var(--glass-border)]">
          {unlocked.slice(0, SHOWN).map((a) => (
            <li key={a.id} className="flex items-center gap-3.5 py-3">
              <span
                aria-hidden
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-muted)] text-sm text-[var(--accent)]"
              >
                <FontAwesomeIcon icon={ACHIEVEMENT_ICONS[a.family] ?? faMedal} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 text-sm font-semibold">
                  {a.name}
                  {a.tier ? (
                    <span className="text-xs font-normal text-[var(--text-muted)]">{TIER_LABEL[a.tier]}</span>
                  ) : null}
                  {fresh.has(a.id) ? (
                    <span className="rounded-md bg-[var(--accent)] px-1.5 py-0.5 text-[0.65rem] font-bold text-white">
                      Nuevo
                    </span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-[var(--text-muted)]">{a.description}</p>
              </div>
              {a.unlockedOn ? (
                <span className="shrink-0 text-xs tabular-nums text-[var(--text-muted)]">
                  {fullDate(a.unlockedOn)}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {next?.progress ? (
        <div className="mt-4">
          <p className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="text-[var(--text-secondary)]">
              Siguiente: <span className="font-medium text-[var(--text-primary)]">{next.name}</span>
            </span>
            <span className="text-xs tabular-nums text-[var(--text-muted)]">
              {next.progress.value} de {next.progress.target}
            </span>
          </p>
          <Meter value={(next.progress.value / next.progress.target) * 100} label={`Progreso de ${next.name}`} />
        </div>
      ) : null}
    </section>
  );
}
