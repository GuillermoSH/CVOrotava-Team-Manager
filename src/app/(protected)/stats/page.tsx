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
import { getCurrentSeason } from "@/utils/getCurrentSeason";
import { useUser } from "@/contexts/UserContext";
import { useSeasons } from "@/contexts/SeasonContext";

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
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

// Custom tooltip for dark theme
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-[var(--color-bg-elevated)] border border-white/10 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-[var(--text-secondary)]">{label}</p>
      <p className="text-white font-semibold">{payload[0].value} partidos</p>
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

  // --- DERIVED DATA ---
  const validMatches = matches.filter((m) => m.result);
  const total = validMatches.length;

  const wins = validMatches.filter((m) => {
    const [us, them] = m.result!.split("-").map(Number);
    return us > them;
  }).length;

  const losses = total - wins;
  const winRate = total ? Math.round((wins / total) * 100) : 0;

  // Result distribution
  type ResultCount = { [key: string]: number };
  const resultDist = Object.entries(
    validMatches.reduce((acc: ResultCount, m) => {
      acc[m.result!] = (acc[m.result!] || 0) + 1;
      return acc;
    }, {} as ResultCount)
  ).map(([result, count]) => ({ result, count }));

  // Performance by location
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

  const locationTypes = [
    { key: "home", label: "Casa", emoji: "🏠" },
    { key: "away", label: "Fuera", emoji: "🚗" },
    { key: "outside_island", label: "Viaje", emoji: "✈️" },
  ];

  const locationStats = locationTypes.map(({ key, label, emoji }) => {
    const stats = rawLocationStats[key] || { total: 0, wins: 0 };
    const winRate = stats.total
      ? Math.round((stats.wins / stats.total) * 100)
      : 0;
    return { location: label, emoji, winRate, total: stats.total };
  });

  return (
    <motion.main
      className="flex flex-col items-center w-full max-w-6xl py-4 text-white"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="w-full mb-6">
        <h1 className="text-2xl font-bold mb-1">
          📊 Estadísticas
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Análisis del rendimiento por temporada
        </p>
      </motion.div>

      {/* Filters */}
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
          className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full"
        >
          {/* Main metrics */}
          <motion.div variants={fadeUp} className="card-glass p-5 flex flex-col justify-between">
            <h2 className="section-header">Resumen general</h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="stat-card !p-3">
                <p className="stat-value !text-2xl">{total}</p>
                <p className="stat-label">Jugados</p>
              </div>
              <div className="stat-card !p-3">
                <p className="text-2xl font-bold text-green-400">{wins}</p>
                <p className="stat-label">Ganados</p>
              </div>
              <div className="stat-card !p-3">
                <p className="text-2xl font-bold text-red-400">{losses}</p>
                <p className="stat-label">Perdidos</p>
              </div>
            </div>

            {/* Win rate ring */}
            <div className="mt-5 flex items-center justify-center gap-4">
              <div className="relative w-16 h-16">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle
                    cx="18" cy="18" r="15.5"
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18" cy="18" r="15.5"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="3"
                    strokeDasharray={`${winRate} ${100 - winRate}`}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                  {winRate}%
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Tasa de victoria</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {wins} de {total} partidos
                </p>
              </div>
            </div>
          </motion.div>

          {/* Result distribution chart */}
          <motion.div variants={fadeUp} className="card-glass p-5">
            <h2 className="section-header">Distribución de Resultados</h2>
            {resultDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={resultDist}>
                  <XAxis
                    dataKey="result"
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-[var(--text-muted)] text-sm py-8 text-center">
                Sin resultados suficientes
              </p>
            )}
          </motion.div>

          {/* Performance by location */}
          <motion.div variants={fadeUp} className="card-glass p-5 md:col-span-2">
            <h2 className="section-header">Rendimiento por lugar</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {locationStats.map((loc) => {
                const winRate = loc.winRate;

                // Interpolate color: red → green based on winRate
                const r1 = 239, g1 = 68, b1 = 68;  // red
                const r2 = 34, g2 = 197, b2 = 94;   // green
                const t = Math.min(winRate / 100, 1);
                const r = Math.round(r1 + (r2 - r1) * t);
                const g = Math.round(g1 + (g2 - g1) * t);
                const b = Math.round(b1 + (b2 - b1) * t);
                const color = `rgb(${r}, ${g}, ${b})`;

                return (
                  <div
                    key={loc.location}
                    className="bg-white/[0.02] rounded-xl p-4 text-center border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all duration-200"
                  >
                    <p className="text-lg mb-1">{loc.emoji}</p>
                    <p className="font-medium text-sm text-[var(--text-secondary)] mb-1">{loc.location}</p>
                    <p
                      className="font-bold text-2xl tabular-nums transition-colors duration-300"
                      style={{ color }}
                    >
                      {winRate}%
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      {loc.total} partidos
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
