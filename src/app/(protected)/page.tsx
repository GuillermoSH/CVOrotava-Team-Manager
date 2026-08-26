"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faClock,
  faLocationDot,
  faTrophy,
  faVolleyball,
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

const EASE = [0.16, 1, 0.3, 1] as const;

export default function ProtectedHome() {
  const { user, loading } = useUser();
  const reduceMotion = useReducedMotion();
  const [matches, setMatches] = useState<Match[]>([]);
  const [paymentsData, setPaymentsData] = useState<{
    data: { user_id: string; amount: string | number; status: string }[];
    isAdmin: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const currentSeason = getCurrentSeason();
        const [matchesRes, paymentsRes] = await Promise.all([
          fetch(
            `/api/matches?gender=${user.gender}&season=${currentSeason}&order=asc`
          ),
          fetch("/api/payments"),
        ]);

        const data = await matchesRes.json();
        setMatches(data || []);

        if (paymentsRes.ok) {
          const pData = await paymentsRes.json();
          setPaymentsData(pData);
        }
      } catch (err) {
        console.error("Error cargando datos:", err);
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

  const recentResults = useMemo(
    () =>
      playedMatches
        .filter((m) => m.result)
        .slice(-3)
        .reverse(),
    [playedMatches]
  );

  if (isLoading || loading) return <Loading />;

  const pendingPayments =
    paymentsData?.data?.filter((p) => p.status === "pending") || [];
  const totalPending = pendingPayments.reduce(
    (acc, p) => acc + Number(p.amount),
    0
  );
  const usersInDebt = new Set(pendingPayments.map((p) => p.user_id)).size;
  const greeting =
    user?.gender === "female" ? "Bienvenida" : "Bienvenido";

  return (
    <motion.div
      className="flex w-full flex-col text-[var(--text-primary)]"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
    >
      <header className="mb-6 lg:mb-8">
        <h1 className="text-[1.65rem] font-semibold tracking-tight sm:text-3xl">
          {greeting}, {user?.user_name}
        </h1>
        <p className="mt-1.5 text-sm text-[var(--text-muted)] sm:text-[0.95rem]">
          Resumen de la temporada en curso.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-12 lg:gap-x-10 lg:gap-y-8">
        {/* ── Left column: next match + season ── */}
        <div className="flex flex-col gap-8 lg:col-span-7">
          <section>
            <h2 className="mb-3 text-lg font-semibold tracking-tight sm:text-xl">
              Próximo partido
            </h2>
            {nextMatch ? (
              <Link
                href={`/matches/${nextMatch.id}`}
                className="group relative block overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--color-bg-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
              >
                <div
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,color-mix(in_srgb,var(--accent)_18%,transparent),transparent_55%)]"
                  aria-hidden
                />
                <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
                  <div className="min-w-0">
                    <p className="text-2xl font-bold tracking-tight sm:text-3xl">
                      {nextMatch.opponent}
                    </p>
                    <p className="mt-2 text-sm capitalize text-[var(--text-secondary)] sm:text-base">
                      {new Date(nextMatch.date).toLocaleDateString("es-ES", {
                        weekday: "long",
                        day: "2-digit",
                        month: "long",
                      })}
                    </p>
                    <p className="mt-1.5 flex items-center gap-2 text-sm text-[var(--text-muted)]">
                      <FontAwesomeIcon
                        icon={faLocationDot}
                        className="shrink-0 text-[var(--accent)]"
                      />
                      <span>
                        {nextMatch.venues?.venue_name || "Sin pabellón"}
                      </span>
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-[var(--accent)] transition-transform group-hover:translate-x-0.5">
                    Ver detalles
                    <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                  </span>
                </div>
              </Link>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--border-dashed)] bg-[var(--surface-faint)] px-5 py-8 text-center">
                <p className="text-sm text-[var(--text-muted)]">
                  No hay partidos próximos en el calendario.
                </p>
                <Link
                  href="/matches"
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]"
                >
                  Ir al calendario
                  <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                </Link>
              </div>
            )}
          </section>

          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
                Tu temporada
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                Rendimiento y calendario
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-[minmax(0,6.5rem)_1fr] sm:items-start sm:gap-8">
              <div>
                <p className="text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">
                  {winRate}
                  <span className="text-xl font-semibold text-[var(--text-muted)] sm:text-2xl">
                    %
                  </span>
                </p>
                <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
                  victorias
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                  {playedWithResult > 0 ? (
                    <>
                      {wins} victoria{wins === 1 ? "" : "s"} ·{" "}
                      {playedWithResult} con resultado
                    </>
                  ) : (
                    "Aún sin partidos con resultado"
                  )}
                </p>
              </div>

              <div className="min-w-0 space-y-5">
                <div>
                  <div className="mb-2 flex items-baseline justify-between gap-3">
                    <span className="text-sm text-[var(--text-secondary)]">
                      Calendario
                    </span>
                    <span className="text-xs tabular-nums text-[var(--text-muted)]">
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
                    className="h-1.5 overflow-hidden rounded-full bg-[var(--progress-track)]"
                    role="img"
                    aria-label={`Progreso del calendario: ${Math.round(playedShare)} por ciento jugado`}
                  >
                    <div
                      className="h-full bg-[var(--accent)] transition-[width] duration-500 ease-out"
                      style={{ width: `${playedShare}%` }}
                    />
                  </div>
                </div>

                <dl className="grid grid-cols-3 gap-3 border-t border-[var(--glass-border)] pt-4">
                  <div>
                    <dt className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--accent)]">
                      <FontAwesomeIcon
                        icon={faVolleyball}
                        className="text-[0.7rem]"
                        aria-hidden
                      />
                      Jugados
                    </dt>
                    <dd className="mt-1 text-xl font-bold tabular-nums text-[var(--accent)] sm:text-2xl">
                      {totalPlayed}
                    </dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--color-success)]">
                      <FontAwesomeIcon
                        icon={faTrophy}
                        className="text-[0.7rem]"
                        aria-hidden
                      />
                      Victorias
                    </dt>
                    <dd className="mt-1 text-xl font-bold tabular-nums text-[var(--color-success)] sm:text-2xl">
                      {wins}
                    </dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--color-info)]">
                      <FontAwesomeIcon
                        icon={faClock}
                        className="text-[0.7rem]"
                        aria-hidden
                      />
                      Restantes
                    </dt>
                    <dd className="mt-1 text-xl font-bold tabular-nums text-[var(--color-info)] sm:text-2xl">
                      {totalUpcoming}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>
        </div>

        {/* ── Right column: payments + results + admin ── */}
        <div className="flex flex-col gap-8 lg:col-span-5">
          {paymentsData && (
            <section>
              <Link
                href="/payments"
                className={`group flex flex-col gap-2 rounded-xl border px-4 py-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] sm:flex-row sm:items-center sm:justify-between ${
                  totalPending > 0
                    ? "border-[color-mix(in_srgb,var(--accent)_35%,var(--glass-border))] bg-[var(--accent-muted)]"
                    : "border-[var(--glass-border)] bg-transparent hover:bg-[var(--glass-surface)]"
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    Estado de cuotas
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {paymentsData.isAdmin ? (
                      totalPending > 0 ? (
                        <>
                          Hay{" "}
                          <strong className="tabular-nums text-[var(--text-primary)]">
                            {usersInDebt}
                          </strong>{" "}
                          jugador{usersInDebt === 1 ? "" : "es"} con{" "}
                          <strong className="tabular-nums text-[var(--accent)]">
                            {totalPending}€
                          </strong>{" "}
                          pendiente.
                        </>
                      ) : (
                        <span className="payment-blurb-ok font-medium">
                          Todos los jugadores están al día con sus pagos.
                        </span>
                      )
                    ) : totalPending > 0 ? (
                      <>
                        Tienes{" "}
                        <strong className="tabular-nums text-[var(--text-primary)]">
                          {pendingPayments.length}
                        </strong>{" "}
                        pago{pendingPayments.length === 1 ? "" : "s"} sin
                        liquidar por{" "}
                        <strong className="tabular-nums text-[var(--accent)]">
                          {totalPending}€
                        </strong>
                        .
                      </>
                    ) : (
                      <span className="payment-blurb-ok font-medium">
                        ¡Perfecto! Estás al día con todos tus pagos.
                      </span>
                    )}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors group-hover:text-[var(--accent)]">
                  Ver detalles
                  <FontAwesomeIcon
                    icon={faArrowRight}
                    className="text-xs transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            </section>
          )}

          <section>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
                Últimos resultados
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                Últimos 3 con marcador
              </p>
            </div>

            {recentResults.length === 0 ? (
              <p className="border-t border-[var(--glass-border)] py-6 text-sm text-[var(--text-muted)]">
                No hay resultados recientes.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--glass-border)] border-y border-[var(--glass-border)]">
                {recentResults.map((m) => {
                  const [us, them] = m.result
                    ? m.result.split("-").map(Number)
                    : [0, 0];
                  const isWin = us > them;

                  return (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {m.gender === "male" ? "S.M." : "S.F."} vs{" "}
                          <span className="text-[var(--text-secondary)]">
                            {m.opponent}
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                          {new Date(m.date).toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "short",
                          })}{" "}
                          · {m.venues?.venue_name || "Sin pabellón"}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-md px-2 py-1 text-sm font-bold tabular-nums ${
                          isWin
                            ? "match-result-score--win"
                            : "match-result-score--loss"
                        }`}
                      >
                        {m.result}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {user?.isAdmin && (
            <section>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
                  Partidos sin resultado
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Pendientes de marcador
                </p>
              </div>

              {pendingMatches.length === 0 ? (
                <p className="status-chip-all-clear inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]"
                    aria-hidden
                  />
                  Todo actualizado
                </p>
              ) : (
                <ul className="divide-y divide-[var(--glass-border)] border-y border-[var(--glass-border)]">
                  {pendingMatches.slice(0, 5).map((m) => (
                    <li
                      key={m.id}
                      className="flex flex-col gap-1.5 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="text-sm text-[var(--text-secondary)]">
                        <span className="font-medium text-[var(--text-primary)]">
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
                        className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)]"
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
            </section>
          )}
        </div>
      </div>
    </motion.div>
  );
}
