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
  faVolleyball,
  faMedal,
  faClock,
  faMoneyBillWave,
} from "@fortawesome/free-solid-svg-icons";
import { useUser } from "@/contexts/UserContext";
import { getCurrentSeason } from "@/utils/getCurrentSeason";

type Match = {
  id: string;
  date: string;
  opponent: string;
  result?: string | null;
  gender: "male" | "female";
  season: string;
  venues?: { venue_name: string } | null;
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fadeUp: any = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

export default function ProtectedHome() {
  const { user, loading } = useUser();
  const [matches, setMatches] = useState<Match[]>([]);
  const [paymentsData, setPaymentsData] = useState<{ data: { user_id: string; amount: string | number; status: string }[], isAdmin: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const currentSeason = getCurrentSeason();
        const [matchesRes, paymentsRes] = await Promise.all([
          fetch(`/api/matches?gender=${user.gender}&season=${currentSeason}&order=asc`),
          fetch("/api/payments")
        ]);
        
        const data = await matchesRes.json();
        setMatches(data || []);

        if (paymentsRes.ok) {
          const pData = await paymentsRes.json();
          setPaymentsData(pData);
        }
      } catch (err) {
        console.error("❌ Error cargando datos:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user]);

  const now = new Date();

  const playedMatches = matches.filter((m) => new Date(m.date) < now);
  const upcomingMatches = matches
    .filter((m) => new Date(m.date) >= now)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));

  const nextMatch = upcomingMatches[0];

  const totalPlayed = playedMatches.length;
  const totalUpcoming = upcomingMatches.length;

  const wins = playedMatches.filter((m) => {
    if (!m.result) return false;
    const [us, them] = m.result.split("-").map(Number);
    return us > them;
  }).length;

  const pendingMatches = playedMatches.filter((m) => !m.result);

  const stats = useMemo(
    () => [
      { label: "Jugados", value: totalPlayed, icon: faVolleyball },
      { label: "Victorias", value: wins, icon: faMedal },
      { label: "Restantes", value: totalUpcoming, icon: faClock },
    ],
    [totalPlayed, wins, totalUpcoming]
  );

  if (isLoading || loading)
    return (
      <div className="flex items-center justify-center flex-1">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  // Cálculos resumen de pagos
  const pendingPayments = paymentsData?.data?.filter((p: { status: string; amount: number | string; user_id: string }) => p.status === "pending") || [];
  const totalPending = pendingPayments.reduce((acc: number, p: { amount: string | number }) => acc + Number(p.amount), 0);
  const usersInDebt = new Set(pendingPayments.map((p: { user_id: string }) => p.user_id)).size;

  return (
    <motion.main
      className="flex flex-col items-center w-full max-w-6xl py-4 text-white"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      {/* ── Header de bienvenida ── */}
      <motion.div
        variants={fadeUp}
        className="w-full card-glass p-5 sm:p-6 mb-6 flex items-center justify-between overflow-hidden relative"
      >
        {/* Decorative gradient orb */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <p className="text-sm text-[var(--text-muted)] mb-1">Panel de control</p>
          <h1 className="text-xl sm:text-2xl font-bold">
            {user?.gender == "female" ? "Bienvenida" : "Bienvenido"},{" "}
            <span className="bg-gradient-to-r from-red-400 to-red-500 bg-clip-text text-transparent">
              {user?.user_name}
            </span>{" "}
            👋
          </h1>
        </div>
        <Image
          src="/assets/imgs/voleipuerto_128x128.webp"
          alt="Logo"
          width={44}
          height={44}
          className="relative z-10 rounded-xl opacity-80"
        />
      </motion.div>

      {/* ── Stats rápidas ── */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 w-full">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            variants={fadeUp}
            className="card-glass stat-card group"
          >
            <div className="w-9 h-9 mx-auto mb-2.5 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center group-hover:bg-[var(--accent)] group-hover:shadow-[var(--shadow-glow)] transition-all duration-300">
              <FontAwesomeIcon
                icon={stat.icon}
                className="text-red-400 group-hover:text-white text-sm transition-colors duration-300"
              />
            </div>
            <p className="stat-value">{stat.value}</p>
            <p className="stat-label">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Resumen de Pagos ── */}
      {paymentsData && (
        <motion.section variants={fadeUp} className="w-full mb-5">
          <Link href="/payments" className="block relative overflow-hidden rounded-2xl p-5 sm:p-6 card-glass group border border-red-500/20 hover:border-red-500/40 transition-colors">
            {/* Background glow for urgency if there are debts */}
            {((!paymentsData.isAdmin && totalPending > 0) || (paymentsData.isAdmin && totalPending > 0)) && (
              <div className="absolute -inset-10 bg-red-600/10 blur-3xl pointer-events-none" />
            )}
            
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2 mb-1">
                  <FontAwesomeIcon icon={faMoneyBillWave} className="text-red-400" />
                  Estado de Cuotas
                </h2>
                
                {paymentsData.isAdmin ? (
                  <p className="text-sm text-[var(--text-muted)]">
                    {totalPending > 0 
                      ? <>Hay <strong className="text-white">{usersInDebt} jugador{usersInDebt===1?'':'es'}</strong> con un total de <strong className="text-red-400">{totalPending}€</strong> pendiente.</>
                      : 'Todos los jugadores están al día con sus pagos.'}
                  </p>
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">
                    {totalPending > 0
                      ? <>Tienes <strong className="text-white">{pendingPayments.length} pago{pendingPayments.length===1?'':'s'}</strong> por un total de <strong className="text-red-400">{totalPending}€</strong> pendiente.</>
                      : '¡Perfecto! Estás al día con todos tus pagos.'}
                  </p>
                )}
              </div>
              
              <div className="flex-shrink-0 bg-white/5 rounded-full px-4 py-2 border border-white/10 group-hover:bg-white/10 transition self-end sm:self-auto">
                <span className="text-sm font-medium">Ver detalles &rarr;</span>
              </div>
            </div>
          </Link>
        </motion.section>
      )}

      {/* ── Próximo partido ── */}
      <motion.section variants={fadeUp} className="card-glass p-5 sm:p-6 w-full mb-5">
        <h2 className="section-header">
          <FontAwesomeIcon icon={faCalendarDays} className="icon" />
          Próximo partido
        </h2>
        {nextMatch ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
            <div>
              <p className="font-semibold text-lg text-white">{nextMatch.opponent}</p>
              <p className="text-sm text-[var(--text-muted)] mt-0.5">
                {new Date(nextMatch.date).toLocaleDateString("es-ES", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                })}{" "}
                •{" "}
                <span className="text-[var(--text-secondary)]">
                  {nextMatch.venues?.venue_name || "Sin pabellón"}
                </span>
              </p>
            </div>
            <Link href={`/matches/${nextMatch.id}`} className="btn-primary self-end sm:self-auto">
              Ver detalles
            </Link>
          </div>
        ) : (
          <p className="text-[var(--text-muted)] text-sm">No hay partidos próximos.</p>
        )}
      </motion.section>

      {/* ── Últimos resultados ── */}
      <motion.section variants={fadeUp} className="card-glass p-5 sm:p-6 w-full">
        <h2 className="section-header">
          <FontAwesomeIcon icon={faTrophy} className="icon" />
          Últimos resultados
        </h2>
        {playedMatches.length === 0 ? (
          <p className="text-[var(--text-muted)] text-sm">No hay resultados recientes.</p>
        ) : (
          <ul className="space-y-2">
            {playedMatches
              .filter((m) => m.result)
              .slice(-3)
              .reverse()
              .map((m) => {
                const [us, them] = m.result
                  ? m.result.split("-").map(Number)
                  : [0, 0];
                const isWin = us > them;

                return (
                  <li
                    key={m.id}
                    className="flex items-center justify-between rounded-xl p-3.5 bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-1 h-10 rounded-full ${
                          isWin ? "bg-green-500" : "bg-red-500"
                        }`}
                      />
                      <div>
                        <p className="font-medium text-sm text-white">
                          {m.gender === "male" ? "S.M." : "S.F."} vs{" "}
                          <span className="text-[var(--text-secondary)]">{m.opponent}</span>
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          {new Date(m.date).toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "short",
                          })}{" "}
                          • {m.venues?.venue_name || "Sin pabellón"}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-bold text-base ${
                        isWin ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {m.result}
                    </span>
                  </li>
                );
              })}
          </ul>
        )}
      </motion.section>

      {/* ── Admin: Partidos sin resultado ── */}
      {user?.isAdmin && (
        <motion.section variants={fadeUp} className="card-glass p-5 sm:p-6 w-full mt-5">
          <h2 className="section-header">
            <FontAwesomeIcon icon={faClipboardList} className="icon" />
            Partidos sin resultado
          </h2>
          {pendingMatches.length === 0 ? (
            <p className="text-green-400/80 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              Todo actualizado
            </p>
          ) : (
            <ul className="space-y-1.5">
              {pendingMatches.slice(0, 5).map((m) => (
                <li
                  key={m.id}
                  className="flex justify-between items-center text-sm py-2 px-3 rounded-lg hover:bg-white/[0.03] transition"
                >
                  <span className="text-[var(--text-secondary)]">
                    {m.opponent} •{" "}
                    {new Date(m.date).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                  <Link
                    href={`/matches/edit/${m.id}`}
                    className="text-red-400 hover:text-red-300 font-medium transition-colors"
                  >
                    Añadir resultado →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </motion.section>
      )}
    </motion.main>
  );
}
