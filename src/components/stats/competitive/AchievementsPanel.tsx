"use client";

import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowTrendUp,
  faBroom,
  faCrosshairs,
  faFire,
  faHandFist,
  faHouse,
  faMedal,
  faPlaneDeparture,
  faShieldHalved,
  faSnowflake,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { Achievement } from "@/lib/stats/competitive/achievements";
import type { CompetitiveStats } from "@/lib/stats/competitive/build";
import { newlyUnlocked } from "@/lib/stats/competitive/achievementsSeen";
import { readPref, writePref } from "@/lib/prefs";
import { fullDate } from "./format";
import { Meter } from "./ui";

export const ACHIEVEMENT_ICONS: Record<string, IconDefinition> = {
  racha: faFire,
  barrida: faBroom,
  remontada: faArrowTrendUp,
  "sangre-fria": faSnowflake,
  cazagigantes: faCrosshairs,
  venganza: faHandFist,
  fortin: faHouse,
  viajero: faPlaneDeparture,
  muralla: faShieldHalved,
  "ano-pasado": faMedal,
};

export const TIER_LABEL = { 1: "Bronce", 2: "Plata", 3: "Oro" } as const;

function Row({ a, fresh }: Readonly<{ a: Achievement; fresh: boolean }>) {
  return (
    <li className="flex items-start gap-3.5 py-3.5">
      <span
        aria-hidden
        className={`mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full text-sm ${
          a.unlocked
            ? "bg-[var(--accent-muted)] text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_38%,transparent)]"
            : "border border-dashed border-[var(--border-dashed)] text-[var(--text-muted)]"
        }`}
      >
        <FontAwesomeIcon icon={ACHIEVEMENT_ICONS[a.family] ?? faMedal} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`font-semibold ${a.unlocked ? "" : "text-[var(--text-secondary)]"}`}>{a.name}</span>
          {a.tier ? <span className="text-xs text-[var(--text-muted)]">{TIER_LABEL[a.tier]}</span> : null}
          {fresh ? (
            <span className="rounded-md bg-[var(--accent)] px-1.5 py-0.5 text-[0.65rem] font-bold text-white">Nuevo</span>
          ) : null}
        </p>
        <p className="mt-0.5 text-sm text-[var(--text-muted)]">{a.description}</p>
        {!a.unlocked && a.progress ? (
          <div className="mt-2 flex max-w-xs items-center gap-3">
            <Meter className="flex-1" value={(a.progress.value / a.progress.target) * 100} label={`Progreso de ${a.name}`} />
            <span className="text-xs tabular-nums text-[var(--text-muted)]">
              {a.progress.value} de {a.progress.target}
            </span>
          </div>
        ) : null}
      </div>
      {a.unlocked && a.unlockedOn ? (
        <p className="shrink-0 pt-1 text-xs tabular-nums text-[var(--text-muted)]">{fullDate(a.unlockedOn)}</p>
      ) : null}
    </li>
  );
}

export default function AchievementsPanel({ stats }: Readonly<{ stats: CompetitiveStats }>) {
  const all = stats.achievements;
  const unlocked = useMemo(
    () => all.filter((a) => a.unlocked).sort((a, b) => (b.unlockedOn ?? "").localeCompare(a.unlockedOn ?? "")),
    [all]
  );
  const locked = useMemo(
    () =>
      all
        .filter((a) => !a.unlocked)
        .sort((a, b) => (b.progress?.value ?? 0) / (b.progress?.target ?? 1) - (a.progress?.value ?? 0) / (a.progress?.target ?? 1)),
    [all]
  );

  // Los desbloqueados desde la última visita salen como «Nuevo» (la primera vez, ninguno).
  const storageKey = `cvorotava-achievements-seen:${stats.season}:${stats.gender}`;
  const unlockedKey = unlocked.map((a) => a.id).join(",");
  const [fresh, setFresh] = useState<string[]>([]);
  useEffect(() => {
    const ids = unlockedKey ? unlockedKey.split(",") : [];
    let seen: string[] | null = null;
    try {
      const raw = readPref(storageKey);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      seen = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : null;
    } catch {
      seen = null;
    }
    setFresh(newlyUnlocked(ids, seen));
    writePref(storageKey, JSON.stringify(ids));
  }, [storageKey, unlockedKey]);

  if (all.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">Los logros aparecen cuando hay una liga en la temporada.</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      {unlocked.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Desbloqueados · {unlocked.length}</h3>
          <ul className="mt-1 divide-y divide-[var(--glass-border)]">
            {unlocked.map((a) => (
              <Row key={a.id} a={a} fresh={fresh.includes(a.id)} />
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">Todavía no hay logros desbloqueados esta temporada.</p>
      )}
      {locked.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Por conseguir · {locked.length}</h3>
          <ul className="mt-1 divide-y divide-[var(--glass-border)]">
            {locked.map((a) => (
              <Row key={a.id} a={a} fresh={false} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
