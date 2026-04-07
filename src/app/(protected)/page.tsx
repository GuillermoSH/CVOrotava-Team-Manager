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
  faLocationDot,
  faArrowRight,
} from "@fortawesome/free-solid-svg-icons";
import { useUser } from "@/contexts/UserContext";
import { getCurrentSeason } from "@/utils/getCurrentSeason";
import Loading from "@/components/common/Loading";

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
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
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

  const playedWithResult = useMemo(
    () => playedMatches.filter((m) => m.result).length,
    [playedMatches]
  );

  const winRate = useMemo(
    () =>
      playedWithResult > 0 ? Math.round((wins / playedWithResult) * 100) : 0,
    [wins, playedWithResult]
  );

  const seasonTotal = totalPlayed + totalUpcoming;
  const playedShare =
    seasonTotal > 0 ? Math.min(100, (totalPlayed / seasonTotal) * 100) : 0;
  const upcomingShare =
    seasonTotal > 0 ? Math.min(100, (totalUpcoming / seasonTotal) * 100) : 0;

  const winBarPct =
    playedWithResult > 0
      ? Math.min(100, (wins / playedWithResult) * 100)
      : 0;

  const ringRadius = 44;
  const ringCirc = 2 * Math.PI * ringRadius;
  const ringOffset = ringCirc - (winRate / 100) * ringCirc;

  if (isLoading || loading) return <Loading />;

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

      {/* ── Resumen de temporada (vista unificada) ── */}
      <motion.section
        variants={fadeUp}
        className="w-full mb-6 card-glass overflow-hidden relative"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-red-600/[0.07] via-transparent to-violet-600/[0.04] pointer-events-none" />
        <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col gap-6 p-5 sm:gap-8 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-muted)] border border-red-500/20">
              <FontAwesomeIcon
                icon={faVolleyball}
                className="text-red-400 text-sm"
              />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold leading-tight text-white">
                Tu temporada
              </h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Rendimiento y calendario de la temporada en curso
              </p>
            </div>
          </div>

          <div className="flex w-full min-w-0 flex-col items-stretch gap-8 lg:flex-row lg:gap-10">
            {/* Win rate ring */}
            <div className="flex flex-col items-center shrink-0">
              <div
                className="relative w-[132px] h-[132px]"
                role="img"
                aria-label={`Porcentaje de victorias: ${winRate} por ciento`}
              >
                <svg
                  className="w-full h-full -rotate-90"
                  viewBox="0 0 112 112"
                  aria-hidden
                >
                  <circle
                    cx="56"
                    cy="56"
                    r={ringRadius}
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="10"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r={ringRadius}
                    fill="none"
                    stroke="url(#homeWinGrad)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={ringCirc}
                    strokeDashoffset={ringOffset}
                    className="transition-[stroke-dashoffset] duration-700 ease-out"
                  />
                  <defs>
                    <linearGradient
                      id="homeWinGrad"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#e62222" />
                      <stop offset="100%" stopColor="#ff6b6b" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-bold tabular-nums bg-gradient-to-br from-white to-white/80 bg-clip-text text-transparent">
                    {winRate}%
                  </span>
                  <span className="text-[0.65rem] uppercase tracking-wider text-[var(--text-muted)] font-semibold mt-0.5">
                    victorias
                  </span>
                </div>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-2 text-center max-w-[11rem]">
                {playedWithResult > 0 ? (
                  <>
                    <span className="text-[var(--text-secondary)]">
                      {wins} victoria{wins === 1 ? "" : "s"}
                    </span>
                    {" · "}
                    {playedWithResult} con resultado
                  </>
                ) : (
                  "Aún sin partidos con resultado"
                )}
              </p>
            </div>

            <div className="flex-1 min-w-0 space-y-5">
              {/* Calendar split */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-medium text-[var(--text-secondary)]">
                    Calendario
                  </span>
                  <span className="text-xs text-[var(--text-muted)] tabular-nums">
                    {totalPlayed} jugados
                    {seasonTotal > 0 && (
                      <>
                        {" · "}
                        {totalUpcoming} restante
                        {totalUpcoming === 1 ? "" : "s"}
                      </>
                    )}
                  </span>
                </div>
                <div
                  className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden flex"
                  role="img"
                  aria-label={`Progreso del calendario: ${Math.round(playedShare)} por ciento jugado`}
                >
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-500 ease-out"
                    style={{ width: `${playedShare}%` }}
                  />
                  <div
                    className="h-full bg-white/[0.12] transition-all duration-500 ease-out"
                    style={{ width: `${upcomingShare}%` }}
                  />
                </div>
                <p className="text-[0.7rem] text-[var(--text-muted)] mt-1.5">
                  Barra izquierda: partidos ya jugados · derecha: pendientes
                </p>
              </div>

              {/* Win ratio bar */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                    <FontAwesomeIcon
                      icon={faMedal}
                      className="text-amber-400/90 text-xs"
                    />
                    Ratio de victorias
                  </span>
                  <span className="text-xs text-[var(--text-muted)] tabular-nums">
                    {playedWithResult > 0
                      ? `${wins} / ${playedWithResult}`
                      : "—"}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-700 to-emerald-400 transition-all duration-500 ease-out"
                    style={{ width: `${winBarPct}%` }}
                  />
                </div>
              </div>

              {/* Inline metrics */}
              <div className="flex flex-wrap gap-3 pt-1">
                <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-white/[0.03] border border-white/[0.06]">
                  <FontAwesomeIcon
                    icon={faVolleyball}
                    className="text-red-400 text-xs shrink-0"
                  />
                  <div>
                    <p className="text-lg font-bold tabular-nums leading-none text-white">
                      {totalPlayed}
                    </p>
                    <p className="text-[0.65rem] uppercase tracking-wide text-[var(--text-muted)] font-semibold mt-0.5">
                      jugados
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-white/[0.03] border border-white/[0.06]">
                  <FontAwesomeIcon
                    icon={faMedal}
                    className="text-amber-400/90 text-xs shrink-0"
                  />
                  <div>
                    <p className="text-lg font-bold tabular-nums leading-none text-white">
                      {wins}
                    </p>
                    <p className="text-[0.65rem] uppercase tracking-wide text-[var(--text-muted)] font-semibold mt-0.5">
                      victorias
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-white/[0.03] border border-white/[0.06]">
                  <FontAwesomeIcon
                    icon={faClock}
                    className="text-sky-400/90 text-xs shrink-0"
                  />
                  <div>
                    <p className="text-lg font-bold tabular-nums leading-none text-white">
                      {totalUpcoming}
                    </p>
                    <p className="text-[0.65rem] uppercase tracking-wide text-[var(--text-muted)] font-semibold mt-0.5">
                      restantes
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Resumen de Pagos ── */}
      {paymentsData && (
        <motion.section variants={fadeUp} className="w-full mb-6">
          <Link
            href="/payments"
            className="block card-glass overflow-hidden relative group border border-white/[0.08] hover:border-red-500/30 transition-colors"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-600/[0.06] via-transparent to-violet-600/[0.03] pointer-events-none" />
            {totalPending > 0 && (
              <div className="absolute -right-8 -top-12 w-48 h-48 bg-red-500/15 rounded-full blur-3xl pointer-events-none" />
            )}

            <div className="relative flex flex-col gap-5 p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-muted)] border border-red-500/20">
                  <FontAwesomeIcon
                    icon={faMoneyBillWave}
                    className="text-red-400 text-sm"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold leading-tight text-white">
                    Estado de cuotas
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {paymentsData.isAdmin
                      ? "Resumen de pagos del equipo"
                      : "Tu resumen de cuotas"}
                  </p>
                </div>
              </div>

              <div className="w-full min-w-0 space-y-4 border-t border-white/[0.08] pt-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    {paymentsData.isAdmin ? (
                      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                        {totalPending > 0 ? (
                          <>
                            Hay{" "}
                            <strong className="text-white tabular-nums">
                              {usersInDebt}
                            </strong>{" "}
                            jugador{usersInDebt === 1 ? "" : "es"} con{" "}
                            <strong className="text-red-400 tabular-nums">
                              {totalPending}€
                            </strong>{" "}
                            pendiente en total.
                          </>
                        ) : (
                          <span className="text-emerald-400/95">
                            Todos los jugadores están al día con sus pagos.
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                        {totalPending > 0 ? (
                          <>
                            Tienes{" "}
                            <strong className="text-white tabular-nums">
                              {pendingPayments.length}
                            </strong>{" "}
                            pago{pendingPayments.length === 1 ? "" : "s"} sin
                            liquidar por un total de{" "}
                            <strong className="text-red-400 tabular-nums">
                              {totalPending}€
                            </strong>
                            .
                          </>
                        ) : (
                          <span className="text-emerald-400/95">
                            ¡Perfecto! Estás al día con todos tus pagos.
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <span className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-white transition-colors group-hover:border-red-500/35 group-hover:bg-[var(--accent-muted)] sm:text-sm">
                    Ver detalles
                    <FontAwesomeIcon
                      icon={faArrowRight}
                      className="text-[0.65rem] opacity-80 transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </motion.section>
      )}

      {/* ── Próximo partido ── */}
      <motion.section variants={fadeUp} className="w-full mb-6">
        {nextMatch ? (
          <Link
            href={`/matches/${nextMatch.id}`}
            className="block card-glass overflow-hidden relative group border border-white/[0.08] hover:border-red-500/30 transition-colors"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-600/[0.07] via-transparent to-violet-600/[0.04] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-36 h-36 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative flex flex-col gap-5 p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-muted)] border border-red-500/20">
                  <FontAwesomeIcon
                    icon={faCalendarDays}
                    className="text-red-400 text-sm"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold leading-tight text-white">
                    Próximo partido
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Fecha y pabellón del encuentro
                  </p>
                </div>
              </div>

              <div className="w-full min-w-0 space-y-4 border-t border-white/[0.08] pt-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold tracking-tight text-white sm:text-xl">
                      {nextMatch.opponent}
                    </p>
                    <p className="mt-2 text-sm capitalize text-[var(--text-secondary)]">
                      {new Date(nextMatch.date).toLocaleDateString("es-ES", {
                        weekday: "long",
                        day: "2-digit",
                        month: "short",
                      })}
                    </p>
                    <p className="mt-1.5 flex items-center gap-2 text-sm text-[var(--text-muted)]">
                      <FontAwesomeIcon
                        icon={faLocationDot}
                        className="shrink-0 text-red-400/90"
                      />
                      <span className="text-[var(--text-secondary)]">
                        {nextMatch.venues?.venue_name || "Sin pabellón"}
                      </span>
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-white transition-colors group-hover:border-red-500/35 group-hover:bg-[var(--accent-muted)] sm:text-sm">
                    Ver detalles
                    <FontAwesomeIcon
                      icon={faArrowRight}
                      className="text-[0.65rem] opacity-80 transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ) : (
          <div className="card-glass overflow-hidden relative w-full border border-white/[0.08]">
            <div className="absolute inset-0 bg-gradient-to-br from-red-600/[0.07] via-transparent to-violet-600/[0.04] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-36 h-36 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative flex flex-col gap-5 p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-muted)] border border-red-500/20">
                  <FontAwesomeIcon
                    icon={faCalendarDays}
                    className="text-red-400 text-sm"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold leading-tight text-white">
                    Próximo partido
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Fecha y pabellón del encuentro
                  </p>
                </div>
              </div>

              <div className="w-full min-w-0 border-t border-white/[0.08] pt-5">
                <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-center">
                  <p className="text-sm text-[var(--text-muted)]">
                    No hay partidos próximos en el calendario.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.section>

      {/* ── Últimos resultados ── */}
      <motion.section
        variants={fadeUp}
        className="card-glass overflow-hidden relative w-full mb-6"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-red-600/[0.07] via-transparent to-violet-600/[0.04] pointer-events-none" />
        <div className="absolute top-1/2 -left-16 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-muted)] border border-red-500/20">
              <FontAwesomeIcon
                icon={faTrophy}
                className="text-red-400 text-sm"
              />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold leading-tight text-white">
                Últimos resultados
              </h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Últimos 3 partidos con marcador
              </p>
            </div>
          </div>

          <div className="w-full min-w-0 border-t border-white/[0.08] pt-5">
              {playedMatches.filter((m) => m.result).length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-center">
                  <p className="text-sm text-[var(--text-muted)]">
                    No hay resultados recientes.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2.5">
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
                          className={`flex items-center justify-between gap-3 rounded-xl p-3.5 sm:p-4 border transition-all duration-200 ${
                            isWin
                              ? "bg-emerald-500/[0.06] border-emerald-500/20 hover:border-emerald-500/35"
                              : "bg-red-500/[0.06] border-red-500/15 hover:border-red-500/30"
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className={`w-1 min-h-[2.75rem] shrink-0 self-stretch rounded-full ${
                                isWin ? "bg-emerald-500" : "bg-red-500"
                              }`}
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-white">
                                {m.gender === "male" ? "S.M." : "S.F."} vs{" "}
                                <span className="text-[var(--text-secondary)]">
                                  {m.opponent}
                                </span>
                              </p>
                              <p className="mt-1 text-xs text-[var(--text-muted)]">
                                {new Date(m.date).toLocaleDateString("es-ES", {
                                  day: "2-digit",
                                  month: "short",
                                })}{" "}
                                · {m.venues?.venue_name || "Sin pabellón"}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums sm:text-base ${
                              isWin
                                ? "border border-emerald-500/25 bg-emerald-500/15 text-emerald-300"
                                : "border border-red-500/25 bg-red-500/15 text-red-300"
                            }`}
                          >
                            {m.result}
                          </span>
                        </li>
                      );
                    })}
                </ul>
              )}
          </div>
        </div>
      </motion.section>

      {/* ── Admin: Partidos sin resultado ── */}
      {user?.isAdmin && (
        <motion.section
          variants={fadeUp}
          className="card-glass overflow-hidden relative w-full"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/[0.07] via-transparent to-violet-600/[0.04] pointer-events-none" />

          <div className="relative flex flex-col gap-5 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-muted)] border border-red-500/20">
                <FontAwesomeIcon
                  icon={faClipboardList}
                  className="text-red-400 text-sm"
                />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold leading-tight text-white">
                  Partidos sin resultado
                </h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Pendientes de registrar marcador
                </p>
              </div>
            </div>

            <div className="w-full min-w-0 border-t border-white/[0.08] pt-5">
                {pendingMatches.length === 0 ? (
                  <div className="flex w-full justify-center">
                    <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                      </span>
                      Todo actualizado
                    </div>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {pendingMatches.slice(0, 5).map((m) => (
                      <li
                        key={m.id}
                        className="flex flex-col gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3.5 py-3 transition-colors hover:border-amber-500/35 sm:flex-row sm:items-center sm:justify-between sm:px-4"
                      >
                        <span className="text-sm text-[var(--text-secondary)]">
                          <span className="font-medium text-white">
                            {m.opponent}
                          </span>
                          <span className="text-[var(--text-muted)]">
                            {" "}
                            ·{" "}
                            {new Date(m.date).toLocaleDateString("es-ES", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </span>
                        </span>
                        <Link
                          href={`/matches/edit/${m.id}`}
                          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-red-400 transition-colors hover:text-red-300"
                        >
                          Añadir resultado
                          <FontAwesomeIcon
                            icon={faArrowRight}
                            className="text-xs"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
            </div>
          </div>
        </motion.section>
      )}
    </motion.main>
  );
}
