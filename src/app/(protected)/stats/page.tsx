"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import FilterBar, { FilterConfig } from "@/components/ui/FilterBar";
import PageHeader from "@/components/ui/PageHeader";
import OpponentTierSection from "@/components/standings/OpponentTierSection";
import { getCurrentSeason } from "@/utils/getCurrentSeason";
import { useUser } from "@/contexts/UserContext";
import { useSeasons } from "@/contexts/SeasonContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarCheck,
  faTrophy,
  faTimesCircle,
  faHouse,
  faCarSide,
  faPlaneDeparture,
  faUsers,
  faLayerGroup,
  faArrowsLeftRight,
  faPercent,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

type Match = {
  id: string;
  season: string;
  gender: "male" | "female";
  result: string | null;
  venues?: { location_type: string };
  opponent: string;
};

type Filters = {
  season?: string;
  gender?: string;
};

const EASE = [0.16, 1, 0.3, 1] as const;

/** Parse marcador tipo "3-1"; devuelve null si no es válido. */
function parseSetScore(
  result: string | null | undefined
): [number, number] | null {
  if (!result || typeof result !== "string") return null;
  const idx = result.indexOf("-");
  if (idx <= 0 || idx >= result.length - 1) return null;
  const us = Number.parseInt(result.slice(0, idx).trim(), 10);
  const them = Number.parseInt(result.slice(idx + 1).trim(), 10);
  if (!Number.isFinite(us) || !Number.isFinite(them)) return null;
  return [us, them];
}

function rateTone(wr: number): string {
  if (wr >= 50) return "text-[var(--color-success)]";
  if (wr > 0) return "text-[var(--color-danger)]";
  return "text-[var(--text-muted)]";
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) => {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-xs shadow-xl">
      <p className="text-[var(--text-secondary)]">{label}</p>
      <p className="font-semibold text-[var(--text-primary)]">
        {payload[0].value} partidos
      </p>
    </div>
  );
};

function StatsSummarySkeleton() {
  return (
    <div className="flex w-full flex-col gap-10">
      <div>
        <div className="mb-4 h-6 w-40 rounded-md bg-[var(--surface-faint)] animate-pulse" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-16 rounded bg-[var(--surface-faint)] animate-pulse" />
              <div className="h-7 w-10 rounded bg-[var(--surface-faint)] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="h-[190px] rounded-xl bg-[var(--surface-faint)] animate-pulse" />
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-12 rounded-lg bg-[var(--surface-faint)] animate-pulse"
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-28 rounded-xl bg-[var(--surface-faint)] animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

export default function StatsPage() {
  const { user } = useUser();
  const reduceMotion = useReducedMotion();
  const [filters, setFilters] = useState<Filters>({
    season: getCurrentSeason(),
    gender: user?.gender ?? undefined,
  });
  const { seasons } = useSeasons();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const filterConfigs: FilterConfig[] = [
    {
      key: "season",
      label: "Temporada",
      options: seasons.map((s) => ({ label: s, value: s })),
    },
    {
      key: "gender",
      label: "Género",
      options: [
        { label: "Masculino", value: "male" },
        { label: "Femenino", value: "female" },
      ],
    },
  ];

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.season) params.set("season", filters.season);
      if (filters.gender) params.set("gender", filters.gender);
      const qs = params.toString();
      const res = await fetch(qs ? `/api/stats?${qs}` : "/api/stats");
      const data = await res.json();
      setMatches(data.matches || []);
      setLoading(false);
    };
    loadStats();
  }, [filters.season, filters.gender]);

  const validMatches = useMemo(
    () => matches.filter((m) => m.result),
    [matches]
  );

  const wins = validMatches.filter((m) => {
    const s = parseSetScore(m.result);
    return s !== null && s[0] > s[1];
  }).length;

  const total = validMatches.length;
  const losses = total - wins;
  const winRate = total ? Math.round((wins / total) * 100) : 0;

  const derivedExtras = useMemo(() => {
    let setsFor = 0;
    let setsAgainst = 0;
    const opponents = new Set<string>();
    for (const m of validMatches) {
      const s = parseSetScore(m.result);
      if (!s) continue;
      const [us, them] = s;
      setsFor += us;
      setsAgainst += them;
      if (m.opponent?.trim()) opponents.add(m.opponent.trim());
    }
    return {
      setsFor,
      setsAgainst,
      setDiff: setsFor - setsAgainst,
      uniqueOpponents: opponents.size,
    };
  }, [validMatches]);

  const resultDistSorted = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const m of validMatches) {
      if (!m.result) continue;
      acc[m.result] = (acc[m.result] || 0) + 1;
    }
    return Object.entries(acc)
      .map(([result, count]) => ({ result, count }))
      .sort((a, b) => b.count - a.count);
  }, [validMatches]);

  const topResultLabel = useMemo(() => {
    if (resultDistSorted.length === 0) return null;
    const top = resultDistSorted[0];
    return `${top.result} (${top.count})`;
  }, [resultDistSorted]);

  interface LocationStats {
    [key: string]: { total: number; wins: number };
  }

  const rawLocationStats = validMatches.reduce((acc: LocationStats, m) => {
    const loc = m.venues?.location_type || "unknown";
    const s = parseSetScore(m.result);
    if (!s) return acc;
    const [us, them] = s;
    acc[loc] ??= { total: 0, wins: 0 };
    acc[loc].total++;
    if (us > them) acc[loc].wins++;
    return acc;
  }, {} as LocationStats);

  const locationTypes: {
    key: string;
    label: string;
    icon: IconDefinition;
  }[] = [
    { key: "home", label: "Casa", icon: faHouse },
    { key: "away", label: "Fuera", icon: faCarSide },
    { key: "outside_island", label: "Viaje", icon: faPlaneDeparture },
  ];

  const locationStats = locationTypes.map(({ key, label, icon }) => {
    const stats = rawLocationStats[key] || { total: 0, wins: 0 };
    const locWinRate = stats.total
      ? Math.round((stats.wins / stats.total) * 100)
      : 0;
    return { location: label, icon, winRate: locWinRate, total: stats.total };
  });

  const diffTone =
    derivedExtras.setDiff > 0
      ? "text-[var(--color-success)]"
      : derivedExtras.setDiff < 0
        ? "text-[var(--color-danger)]"
        : "text-[var(--text-secondary)]";

  const summaryMetrics: {
    key: string;
    label: string;
    value: ReactNode;
    tone: string;
    icon: IconDefinition;
  }[] = [
    {
      key: "played",
      label: "Jugados",
      value: total,
      tone: "text-[var(--accent)]",
      icon: faCalendarCheck,
    },
    {
      key: "wins",
      label: "Ganados",
      value: wins,
      tone: "text-[var(--color-success)]",
      icon: faTrophy,
    },
    {
      key: "losses",
      label: "Perdidos",
      value: losses,
      tone: "text-[var(--color-danger)]",
      icon: faTimesCircle,
    },
    {
      key: "rate",
      label: "Tasa victoria",
      value: `${winRate}%`,
      tone: "text-[var(--text-primary)]",
      icon: faPercent,
    },
    {
      key: "sets",
      label: "Sets F–C",
      value: `${derivedExtras.setsFor}–${derivedExtras.setsAgainst}`,
      tone: "text-[var(--text-primary)]",
      icon: faLayerGroup,
    },
    {
      key: "diff",
      label: "Dif. sets",
      value: `${derivedExtras.setDiff > 0 ? "+" : ""}${derivedExtras.setDiff}`,
      tone: diffTone,
      icon: faArrowsLeftRight,
    },
    {
      key: "rivals",
      label: "Rivales",
      value: derivedExtras.uniqueOpponents,
      tone: "text-[var(--text-primary)]",
      icon: faUsers,
    },
    {
      key: "top",
      label: "Marcador frecuente",
      value: topResultLabel ?? "—",
      tone: "text-[var(--text-primary)]",
      icon: faLayerGroup,
    },
  ];

  return (
    <motion.div
      className="flex w-full flex-col text-[var(--text-primary)]"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
    >
      <PageHeader
        title="Estadísticas"
        subtitle="Rendimiento del equipo por temporada y contexto"
      />

      <FilterBar
        filters={filters}
        setFilters={setFilters}
        configs={filterConfigs}
      />

      {loading ? (
        <StatsSummarySkeleton />
      ) : (
        <div className="flex w-full flex-col gap-10 lg:gap-12">
          <section>
            <h2 className="mb-4 text-lg font-semibold tracking-tight sm:text-xl">
              Resumen
            </h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-5 border-b border-[var(--glass-border)] pb-8 sm:grid-cols-4">
              {summaryMetrics.map((m) => (
                <div key={m.key}>
                  <dt
                    className={`flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-wider ${m.tone}`}
                  >
                    <FontAwesomeIcon
                      icon={m.icon}
                      className="text-[0.7rem]"
                      aria-hidden
                    />
                    {m.label}
                  </dt>
                  <dd
                    className={`mt-1 text-xl font-bold tabular-nums tracking-tight sm:text-2xl ${m.tone}`}
                  >
                    {m.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="grid gap-10 md:grid-cols-2 md:gap-x-10">
            <section>
              <h2 className="mb-4 text-lg font-semibold tracking-tight sm:text-xl">
                Distribución de resultados
              </h2>
              {resultDistSorted.length > 0 ? (
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={resultDistSorted}
                      margin={{ top: 6, right: 2, left: -10, bottom: 0 }}
                    >
                      <XAxis
                        dataKey="result"
                        tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                        axisLine={{ stroke: "var(--chart-axis)" }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                        width={28}
                      />
                      <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ fill: "var(--chart-cursor)" }}
                      />
                      <Bar
                        dataKey="count"
                        fill="var(--accent)"
                        radius={[5, 5, 0, 0]}
                        maxBarSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-6 text-sm text-[var(--text-muted)]">
                  Sin resultados suficientes para mostrar el gráfico
                </p>
              )}
            </section>

            <section>
              <h2 className="mb-4 text-lg font-semibold tracking-tight sm:text-xl">
                Rendimiento por lugar
              </h2>
              <ul className="divide-y divide-[var(--glass-border)]">
                {locationStats.map((loc) => (
                  <li
                    key={loc.location}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <FontAwesomeIcon
                      icon={loc.icon}
                      className="w-4 shrink-0 text-sm text-[var(--accent)]"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {loc.location}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {loc.total} partido{loc.total === 1 ? "" : "s"}
                      </p>
                    </div>
                    <p
                      className={`shrink-0 text-lg font-bold tabular-nums sm:text-xl ${rateTone(loc.winRate)}`}
                    >
                      {loc.winRate}%
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <OpponentTierSection
            season={filters.season}
            gender={filters.gender}
            isAdmin={Boolean(user?.isAdmin)}
          />
        </div>
      )}
    </motion.div>
  );
}
