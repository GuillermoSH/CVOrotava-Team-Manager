"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Loading from "@/components/common/Loading";
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

export default function StatsPage() {
  const { user } = useUser();
  const [filters, setFilters] = useState<Filters>({
    season: getCurrentSeason(),
    gender: user?.gender ?? undefined,
  });
  const { seasons } = useSeasons();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!filters.gender && user?.gender) {
      setFilters((prev) => ({ ...prev, gender: user.gender! }));
    }
  }, [user, filters.gender]);

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
      const res = await fetch(
        `/api/stats?season=${filters.season}&gender=${filters.gender}`
      );
      const data = await res.json();
      setMatches(data.matches || []);
      setLoading(false);
    };
    loadStats();
  }, [filters.season, filters.gender]);

  const validMatches = matches.filter((m) => m.result);
  const total = validMatches.length;

  const wins = validMatches.filter((m) => {
    const [us, them] = m.result!.split("-").map(Number);
    return us > them;
  }).length;

  const losses = total - wins;
  const winRate = total ? Math.round((wins / total) * 100) : 0;

  type ResultCount = { [key: string]: number };
  const resultDist = Object.entries(
    validMatches.reduce((acc: ResultCount, m) => {
      acc[m.result!] = (acc[m.result!] || 0) + 1;
      return acc;
    }, {} as ResultCount)
  ).map(([result, count]) => ({ result, count }));

  interface LocationStats {
    [key: string]: { total: number; wins: number };
  }

  const rawLocationStats = validMatches.reduce((acc: LocationStats, m) => {
    const loc = m.venues?.location_type || "unknown";
    const [us, them] = m.result!.split("-").map(Number);
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

  const ringR = 15.5;
  const ringCirc = 2 * Math.PI * ringR;
  const ringDash = (winRate / 100) * ringCirc;

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
        <Loading />
      ) : (
        <motion.div
          variants={stagger}
          className="grid w-full grid-cols-1 gap-4 md:grid-cols-2"
        >
          <motion.div
            variants={fadeUp}
            className="card-glass flex flex-col justify-between gap-5 p-5 sm:p-6"
          >
            <h2 className="section-header">Resumen general</h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="stat-card group !p-4">
                <span className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-faint)] text-[var(--accent)] transition-colors group-hover:bg-[var(--accent-muted)]">
                  <FontAwesomeIcon icon={faCalendarCheck} className="text-sm" />
                </span>
                <p className="stat-value !text-2xl">{total}</p>
                <p className="stat-label">Jugados</p>
              </div>
              <div className="stat-card group !p-4">
                <span className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 transition-colors group-hover:bg-emerald-500/15">
                  <FontAwesomeIcon icon={faTrophy} className="text-sm" />
                </span>
                <p className="text-2xl font-bold text-green-400">{wins}</p>
                <p className="stat-label">Ganados</p>
              </div>
              <div className="stat-card group !p-4">
                <span className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 text-red-400 transition-colors group-hover:bg-red-500/15">
                  <FontAwesomeIcon icon={faTimesCircle} className="text-sm" />
                </span>
                <p className="text-2xl font-bold text-red-400">{losses}</p>
                <p className="stat-label">Perdidos</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-5 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-faint)]/80 px-4 py-4">
              <div className="relative h-20 w-20 shrink-0">
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                  <circle
                    cx="18"
                    cy="18"
                    r={ringR}
                    fill="none"
                    stroke="var(--chart-track)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r={ringR}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="3"
                    strokeDasharray={`${ringDash} ${ringCirc}`}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-base font-bold tabular-nums text-[var(--text-primary)]">
                  {winRate}%
                </span>
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Tasa de victoria
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {wins} de {total} partidos con resultado
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="card-glass p-5 sm:p-6">
            <h2 className="section-header">Distribución de resultados</h2>
            {resultDist.length > 0 ? (
              <div className="mt-2 h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={resultDist} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                    <XAxis
                      dataKey="result"
                      tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                      axisLine={{ stroke: "var(--chart-axis)" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ fill: "var(--chart-cursor)" }}
                    />
                    <Bar
                      dataKey="count"
                      fill="var(--accent)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-[var(--text-muted)]">
                Sin resultados suficientes para mostrar el gráfico
              </p>
            )}
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="card-glass p-5 sm:p-6 md:col-span-2"
          >
            <h2 className="section-header">Rendimiento por lugar</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                    className="flex flex-col items-center rounded-2xl border border-[var(--glass-border)] bg-[var(--surface-faint)] p-5 text-center transition-all duration-200 hover:border-[var(--glass-border-hover)] hover:bg-[var(--color-bg-card)]"
                  >
                    <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--glass-border)] bg-[var(--color-bg-card)] text-[var(--accent)]">
                      <FontAwesomeIcon icon={loc.icon} className="text-lg" />
                    </span>
                    <p className="mb-1 text-sm font-medium text-[var(--text-secondary)]">
                      {loc.location}
                    </p>
                    <p
                      className="text-3xl font-bold tabular-nums transition-colors duration-300"
                      style={{ color }}
                    >
                      {wr}%
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {loc.total} partido{loc.total === 1 ? "" : "s"}
                    </p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.main>
  );
}
