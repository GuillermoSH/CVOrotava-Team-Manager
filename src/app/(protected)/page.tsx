"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarDays,
  faClipboardList,
  faTrophy,
  faChartLine,
} from "@fortawesome/free-solid-svg-icons";
import { useUser } from "@/contexts/UserContext";
import { getCurrentSeason } from "@/utils/getCurrentSeason"; // ✅ Asegúrate de tener este helper

type Match = {
  id: string;
  date: string;
  opponent: string;
  result?: string | null;
  gender: "male" | "female";
  season: string;
  venues?: { venue_name: string } | null;
};

export default function ProtectedHome() {
  const { user, loading } = useUser();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const currentSeason = getCurrentSeason();
        const res = await fetch(
          `/api/matches?gender=${user.gender}&season=${currentSeason}&order=asc`
        );
        const data = await res.json();
        setMatches(data || []);
      } catch (err) {
        console.error("❌ Error cargando datos:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user]);

  const now = new Date();

  // ✅ Clasificamos los partidos según fecha
  const playedMatches = matches.filter((m) => new Date(m.date) < now);
  const upcomingMatches = matches
    .filter((m) => new Date(m.date) >= now)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));

  const nextMatch = upcomingMatches[0];

  // ✅ Métricas
  const totalPlayed = playedMatches.length;
  const totalUpcoming = upcomingMatches.length;

  const wins = playedMatches.filter((m) => {
    if (!m.result) return false;
    const [us, them] = m.result.split("-").map(Number);
    return us > them;
  }).length;

  const pendingMatches = playedMatches.filter((m) => !m.result);

  // 📊 Estadísticas (orden que pediste)
  const stats = useMemo(
    () => [
      { label: "Partidos jugados", value: totalPlayed },
      { label: "Victorias", value: wins },
      { label: "Partidos restantes", value: totalUpcoming },
    ],
    [totalPlayed, wins, totalUpcoming]
  );

  if (isLoading || loading)
    return <p className="text-center mt-10 text-gray-400">Cargando panel...</p>;

  return (
    <main className="flex flex-col items-center w-full p-6 text-white">
      {/* 🔻 Encabezado */}
      <motion.div
        className="w-full max-w-6xl bg-gradient-to-r from-red-600/30 to-transparent rounded-2xl p-4 mb-8 flex justify-between items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h1 className="text-2xl font-bold">
          {user?.gender == "female" ? "Bienvenida" : "Bienvenido"}, <span className="text-red-400">{user?.user_name}</span> 👋
        </h1>
        <Image
          src="/assets/imgs/voleipuerto_128x128.webp"
          alt="Logo"
          width={40}
          height={40}
        />
      </motion.div>

      {/* 📊 Estadísticas rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 w-full max-w-6xl">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white/10 border border-white/10 rounded-xl p-5 text-center shadow-md backdrop-blur-lg"
          >
            <p className="text-3xl font-bold text-red-500">{stat.value}</p>
            <p className="text-sm text-gray-300">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* 🗓 Próximo partido */}
      <motion.section
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white/10 border border-white/10 rounded-2xl p-6 shadow-md backdrop-blur-lg w-full max-w-6xl mb-8"
      >
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <FontAwesomeIcon icon={faCalendarDays} className="text-red-500" />
          Próximo partido
        </h2>
        {nextMatch ? (
          <div className="flex justify-between items-center text-gray-200">
            <div>
              <p className="font-medium text-xl">{nextMatch.opponent}</p>
              <p className="text-sm text-gray-400">
                {new Date(nextMatch.date).toLocaleDateString("es-ES", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                })}{" "}
                • {nextMatch.venues?.venue_name || "Sin pabellón"}
              </p>
            </div>
            <Link
              href={`/matches/${nextMatch.id}`}
              className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded-xl"
            >
              Ver detalles
            </Link>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No hay partidos próximos.</p>
        )}
      </motion.section>

      {/* 🏐 Últimos resultados */}
      <motion.section
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white/10 border border-white/10 rounded-2xl p-6 shadow-md backdrop-blur-lg w-full max-w-6xl"
      >
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <FontAwesomeIcon icon={faTrophy} className="text-red-500" />
          Últimos resultados
        </h2>
        {playedMatches.length === 0 ? (
          <p className="text-gray-500 text-sm">No hay resultados recientes.</p>
        ) : (
          <ul className="space-y-3">
            {playedMatches
              .filter((m) => m.result)
              .slice(-3)
              .reverse()
              .map((m) => {
                const [us, them] = m.result
                  ? m.result.split("-").map(Number)
                  : [0, 0];
                const resultColor =
                  us > them ? "text-green-400" : "text-red-400";

                return (
                  <li
                    key={m.id}
                    className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition border border-transparent hover:border-white/10 flex justify-between items-end"
                  >
                    <div>
                      <p className="font-semibold text-base text-white">
                        {m.gender === "male" ? "S.M." : "S.F."} vs{" "}
                        <span className="text-gray-200">{m.opponent}</span>
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        {new Date(m.date).toLocaleDateString("es-ES", {
                          day: "2-digit",
                          month: "short",
                        })}{" "}
                        • {m.venues?.venue_name || "Sin pabellón"}
                      </p>
                    </div>
                    <span className={`${resultColor} font-bold text-lg`}>
                      {m.result}
                    </span>
                  </li>
                );
              })}
          </ul>
        )}
      </motion.section>

      {/* 🧩 Bloque dinámico según rol */}
      {user?.isAdmin && (
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/10 border border-white/10 rounded-2xl p-6 shadow-md backdrop-blur-lg w-full max-w-6xl mt-8"
        >
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <FontAwesomeIcon icon={faClipboardList} className="text-red-500" />
            Partidos sin resultado
          </h2>
          {pendingMatches.length === 0 ? (
            <p className="text-gray-500 text-sm">Todo actualizado ✅</p>
          ) : (
            <ul className="space-y-2">
              {pendingMatches.slice(0, 5).map((m) => (
                <li key={m.id} className="text-gray-300 flex justify-between">
                  <span>
                    {m.opponent} •{" "}
                    {new Date(m.date).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                  <Link
                    href={`/matches/edit/${m.id}`}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Añadir resultado →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </motion.section>
      )}
    </main>
  );
}
