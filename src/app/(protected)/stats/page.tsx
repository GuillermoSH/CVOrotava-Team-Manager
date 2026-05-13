"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
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
  faChartSimple,
  faCalendarCheck,
  faTrophy,
  faTimesCircle,
  faHouse,
  faCarSide,
  faPlaneDeparture,
  faUsers,
  faLayerGroup,
  faArrowsLeftRight,
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

/** Parse marcador tipo "3-1"; devuelve null si no es válido. */
function parseSetScore(result: string | null | undefined): [number, number] | null {
  if (!result || typeof result !== "string") return null;
  const idx = result.indexOf("-");
  if (idx <= 0 || idx >= result.length - 1) return null;
  const us = Number.parseInt(result.slice(0, idx).trim(), 10);
  const them = Number.parseInt(result.slice(idx + 1).trim(), 10);
  if (!Number.isFinite(us) || !Number.isFinite(them)) return null;
  return [us, them];
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

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
  const StatCell = () => (
    <div className="flex flex-row items-center gap-2 rounded-lg border border-[var(--glass-border)] bg-[var(--surface-faint)] p-2.5">
      <div className="h-8 w-8 shrink-0 rounded-lg bg-[var(--color-bg-card)] animate-pulse" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-2 w-14 rounded bg-[var(--color-bg-card)] animate-pulse" />
        <div className="h-5 w-8 rounded bg-[var(--color-bg-card)] animate-pulse" />
      </div>
    </div>
  );

  return (
    <motion.div variants={stagger} className="flex w-full flex-col gap-4">
      <motion.div variants={fadeUp} className="card-glass p-4 sm:p-5">
        <div className="mb-3 h-5 w-44 rounded-md bg-[var(--surface-faint)] animate-pulse" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <StatCell key={i} />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
          <div className="min-w-0">
            <div className="mb-2 h-4 w-48 max-w-full rounded bg-[var(--surface-faint)] animate-pulse" />
            <div className="h-[190px] w-full rounded-lg bg-[var(--surface-faint)]/80 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="mb-2 h-4 w-44 max-w-full rounded bg-[var(--surface-faint)] animate-pulse" />
            <div className="grid grid-cols-1 gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-14 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-faint)] animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
      <motion.div variants={fadeUp} className="card-glass w-full p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-2">
            <div className="h-6 w-64 max-w-full rounded-md bg-[var(--surface-faint)] animate-pulse" />
            <div className="h-3 w-48 max-w-full rounded-md bg-[var(--surface-faint)] animate-pulse" />
          </div>
          <div className="h-8 w-24 shrink-0 rounded-lg bg-[var(--surface-faint)] animate-pulse" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-32 rounded-2xl border border-[var(--glass-border)] bg-[var(--surface-faint)]/80 animate-pulse"
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function StatsPage() {
  const { user } = useUser();
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

  const resultDist = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const m of validMatches) {
      if (!m.result) continue;
      acc[m.result] = (acc[m.result] || 0) + 1;
    }
    return Object.entries(acc).map(([result, count]) => ({ result, count }));
  }, [validMatches]);

  const resultDistSorted = useMemo(
    () => [...resultDist].sort((a, b) => b.count - a.count),
    [resultDist]
  );

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

  const ringR = 17;
  const ringCx = 22;
  const ringVb = 44;
  const ringCirc = 2 * Math.PI * ringR;
  const ringDash = (winRate / 100) * ringCirc;

  const diffTone =
    derivedExtras.setDiff > 0
      ? "text-emerald-400"
      : derivedExtras.setDiff < 0
        ? "text-red-400"
        : "text-[var(--text-secondary)]";

  return (
    <motion.main
      className="flex w-full max-w-6xl flex-col items-center py-4 text-[var(--text-primary)]"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp} className="relative mb-6 w-full overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-surface)] p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-red-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-12 h-48 w-48 rounded-full bg-violet-500/8 blur-3xl" />
        <div className="relative">
          <PageHeader
            icon={faChartSimple}
            title="Estadísticas"
            subtitle="Rendimiento del equipo por temporada y contexto"
          />
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="w-full">
        <FilterBar
          filters={filters}
          setFilters={setFilters}
          configs={filterConfigs}
        />
      </motion.div>

      {loading ? (
        <StatsSummarySkeleton />
      ) : (
        <motion.div variants={stagger} className="flex w-full flex-col gap-4">
          <motion.div variants={fadeUp} className="card-glass p-4 sm:p-5">
            <h2 className="section-header !mb-3">Resumen y marcadores</h2>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="flex flex-row items-center gap-2 rounded-lg border border-[var(--glass-border)] bg-[var(--surface-faint)] p-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-faint)] text-[var(--accent)]">
                  <FontAwesomeIcon icon={faCalendarCheck} className="text-xs" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Jugados
                  </p>
                  <p className="text-lg font-bold tabular-nums text-[var(--text-primary)]">{total}</p>
                </div>
              </div>
              <div className="flex flex-row items-center gap-2 rounded-lg border border-[var(--glass-border)] bg-[var(--surface-faint)] p-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <FontAwesomeIcon icon={faTrophy} className="text-xs" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Ganados
                  </p>
                  <p className="text-lg font-bold tabular-nums text-green-400">{wins}</p>
                </div>
              </div>
              <div className="flex flex-row items-center gap-2 rounded-lg border border-[var(--glass-border)] bg-[var(--surface-faint)] p-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
                  <FontAwesomeIcon icon={faTimesCircle} className="text-xs" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Perdidos
                  </p>
                  <p className="text-lg font-bold tabular-nums text-red-400">{losses}</p>
                </div>
              </div>
              <div className="flex flex-row items-center gap-2 rounded-lg border border-[var(--glass-border)] bg-[var(--surface-faint)] p-2.5">
                <div className="relative h-14 w-14 shrink-0">
                  <svg
                    viewBox={`0 0 ${ringVb} ${ringVb}`}
                    className="h-full w-full -rotate-90"
                    aria-hidden
                  >
                    <circle
                      cx={ringCx}
                      cy={ringCx}
                      r={ringR}
                      fill="none"
                      stroke="var(--chart-track)"
                      strokeWidth="3.5"
                    />
                    <circle
                      cx={ringCx}
                      cy={ringCx}
                      r={ringR}
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="3.5"
                      strokeDasharray={`${ringDash} ${ringCirc}`}
                      strokeLinecap="round"
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums leading-none text-[var(--text-primary)]">
                    {winRate}%
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Tasa victoria
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {wins}/{total} part.
                  </p>
                </div>
              </div>

              <div className="flex flex-row items-center gap-2 rounded-lg border border-[var(--glass-border)] bg-[var(--surface-faint)] p-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-faint)] text-[var(--accent)]">
                  <FontAwesomeIcon icon={faLayerGroup} className="text-xs" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Sets F–C
                  </p>
                  <p className="text-lg font-bold tabular-nums text-[var(--text-primary)]">
                    {derivedExtras.setsFor}–{derivedExtras.setsAgainst}
                  </p>
                </div>
              </div>
              <div className="flex flex-row items-center gap-2 rounded-lg border border-[var(--glass-border)] bg-[var(--surface-faint)] p-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-faint)] text-[var(--accent)]">
                  <FontAwesomeIcon icon={faArrowsLeftRight} className="text-xs" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Dif. sets
                  </p>
                  <p className={`text-lg font-bold tabular-nums ${diffTone}`}>
                    {derivedExtras.setDiff > 0 ? "+" : ""}
                    {derivedExtras.setDiff}
                  </p>
                </div>
              </div>
              <div className="flex flex-row items-center gap-2 rounded-lg border border-[var(--glass-border)] bg-[var(--surface-faint)] p-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-faint)] text-[var(--accent)]">
                  <FontAwesomeIcon icon={faUsers} className="text-xs" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Rivales
                  </p>
                  <p className="text-lg font-bold tabular-nums text-[var(--text-primary)]">
                    {derivedExtras.uniqueOpponents}
                  </p>
                </div>
              </div>
              <div className="flex min-h-[3.25rem] flex-col justify-center rounded-lg border border-[var(--glass-border)] bg-[var(--surface-faint)] px-2.5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Marcador frecuente
                </p>
                <p className="truncate text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                  {topResultLabel ?? "—"}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
              <div className="min-w-0">
                <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
                  Distribución de resultados
                </h3>
                {resultDistSorted.length > 0 ? (
                  <div className="h-[190px] w-full">
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
                  <p className="py-6 text-center text-xs text-[var(--text-muted)]">
                    Sin resultados suficientes para mostrar el gráfico
                  </p>
                )}
              </div>

              <div className="min-w-0">
                <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
                  Rendimiento por lugar
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {locationStats.map((loc) => {
                    const wr = loc.winRate;
                    const r1 = 239,
                      g1 = 68,
                      b1 = 68;
                    const r2 = 34,
                      g2 = 197,
                      b2 = 94;
                    const t = Math.min(wr / 100, 1);
                    const r = Math.round(r1 + (r2 - r1) * t);
                    const g = Math.round(g1 + (g2 - g1) * t);
                    const b = Math.round(b1 + (b2 - b1) * t);
                    const color = `rgb(${r}, ${g}, ${b})`;

                    return (
                      <div
                        key={loc.location}
                        className="flex flex-row items-center gap-2.5 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-faint)] p-2.5 transition-all duration-200 hover:border-[var(--glass-border-hover)] hover:bg-[var(--color-bg-card)] sm:gap-3 sm:p-3"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--glass-border)] bg-[var(--color-bg-card)] text-[var(--accent)]">
                          <FontAwesomeIcon icon={loc.icon} className="text-xs" />
                        </span>
                        <div className="min-w-0 flex-1 text-left">
                          <p className="text-xs font-medium text-[var(--text-secondary)]">
                            {loc.location}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                            {loc.total} partido{loc.total === 1 ? "" : "s"}
                          </p>
                        </div>
                        <p
                          className="shrink-0 text-right text-lg font-bold tabular-nums transition-colors duration-300 sm:text-xl"
                          style={{ color }}
                        >
                          {wr}%
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeUp}>
            <OpponentTierSection
              season={filters.season}
              gender={filters.gender}
              isAdmin={Boolean(user?.isAdmin)}
            />
          </motion.div>
        </motion.div>
      )}
    </motion.main>
  );
}
