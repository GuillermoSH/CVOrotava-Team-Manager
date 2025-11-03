"use client";

import { useEffect, useState } from "react";
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
  }, [user]);

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

  // Distribución de resultados
  const resultDist = Object.entries(
    validMatches.reduce((acc: any, m) => {
      acc[m.result!] = (acc[m.result!] || 0) + 1;
      return acc;
    }, {})
  ).map(([result, count]) => ({ result, count }));

  // --- Rendimiento por lugar ---
  interface LocationStats {
    [key: string]: { total: number; wins: number };
  }

  // Calculamos las estadísticas reales
  const rawLocationStats = validMatches.reduce((acc: LocationStats, m) => {
    const loc = m.venues?.location_type || "unknown";
    const [us, them] = m.result!.split("-").map(Number);
    acc[loc] ??= { total: 0, wins: 0 };
    acc[loc].total++;
    if (us > them) acc[loc].wins++;
    return acc;
  }, {} as LocationStats);

  // Aseguramos que todas las categorías existan aunque no tengan datos
  const locationTypes = [
    { key: "home", label: "Casa" },
    { key: "away", label: "Fuera" },
    { key: "outside_island", label: "Viaje" },
  ];

  const locationStats = locationTypes.map(({ key, label }) => {
    const stats = rawLocationStats[key] || { total: 0, wins: 0 };
    const winRate = stats.total
      ? Math.round((stats.wins / stats.total) * 100)
      : 0;
    return { location: label, winRate, total: stats.total };
  });

  return (
    <main className="flex flex-col items-center w-full p-6 text-white">
      <h1 className="text-3xl font-bold mb-6">
        📊 Estadísticas de la Temporada
      </h1>

      {/* Filtros */}
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        configs={filterConfigs}
      />

      {loading ? (
        <p className="text-gray-400">Cargando datos...</p>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl"
        >
          {/* Métricas principales */}
          <div className="bg-white/10 flex flex-col justify-between p-6 rounded-2xl border border-white/10">
            <h2 className="text-xl font-semibold mb-4">Resumen general</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-white">{total}</p>
                <p className="text-sm text-gray-400">Jugados</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-500">{wins}</p>
                <p className="text-sm text-gray-400">Ganados</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-red-500">{losses}</p>
                <p className="text-sm text-gray-400">Perdidos</p>
              </div>
            </div>
            <p className="mt-4 text-center text-gray-300">
              Tasa de victoria:{" "}
              <span className="text-red-500 font-semibold">{winRate}%</span>
            </p>
          </div>

          {/* Distribución de resultados */}
          <div className="bg-white/10 p-6 rounded-2xl border border-white/10">
            <h2 className="text-xl font-semibold mb-4">
              Distribución de Resultados
            </h2>
            {resultDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={resultDist}>
                  <XAxis dataKey="result" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#FB2C36" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-sm">
                Sin resultados suficientes
              </p>
            )}
          </div>

          {/* Rendimiento por lugar */}
          <div className="bg-white/10 p-6 rounded-2xl border border-white/10 md:col-span-2">
            <h2 className="text-xl font-semibold mb-4">
              Rendimiento por lugar
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {locationStats.map((loc) => {
                const winRate = loc.winRate;

                // Rojo base (#FB2C36)
                const r1 = 251,
                  g1 = 44,
                  b1 = 54;
                // Verde destino (#22c55e)
                const r2 = 34,
                  g2 = 197,
                  b2 = 94;

                let color: string;

                if (winRate < 50) {
                  color = `rgb(${r1}, ${g1}, ${b1})`; // rojo puro
                } else {
                  // interpolar 50–100% → verde progresivo
                  const t = (winRate - 50) / 50; // normaliza entre 0 y 1
                  const r = Math.round(r1 + (r2 - r1) * t);
                  const g = Math.round(g1 + (g2 - g1) * t);
                  const b = Math.round(b1 + (b2 - b1) * t);
                  color = `rgb(${r}, ${g}, ${b})`;
                }

                return (
                  <li
                    key={loc.location}
                    className="bg-white/5 rounded-xl p-4 text-center border border-white/10 transition-transform hover:scale-105"
                  >
                    <p className="font-semibold mb-1">{loc.location}</p>
                    <p
                      className="font-bold text-2xl transition-colors duration-300"
                      style={{ color }}
                    >
                      {winRate}%
                    </p>
                    <p className="text-sm text-gray-400">
                      {loc.total} partidos
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        </motion.div>
      )}
    </main>
  );
}
