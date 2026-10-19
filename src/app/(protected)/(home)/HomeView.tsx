"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faCalendarPlus,
  faCarSide,
  faHouse,
  faLocationDot,
  faPlaneDeparture,
} from "@fortawesome/free-solid-svg-icons";
import { useUser } from "@/contexts/UserContext";
import HomeSkeleton from "@/components/skeletons/HomeSkeleton";
import PageHeader from "@/components/ui/PageHeader";
import { isQuotaOverdue } from "@/components/payments/quotaDates";
import LatestVideos from "@/components/home/LatestVideos";
import WeekendRoundup from "@/components/home/WeekendRoundup";
import AchievementsGlance from "@/components/home/AchievementsGlance";
import AdminPending from "@/components/home/AdminPending";
import PaymentsCard from "@/components/home/PaymentsCard";
import Birthdays from "@/components/home/Birthdays";
import type { VideoListItem } from "@/lib/videos/constants";
import type { Achievement } from "@/lib/stats/competitive/achievements";
import type { WeekendRoundup as Roundup } from "@/lib/home/weekendRoundup";
import type { AdminPendingData } from "@/lib/home/loadAdminPending.types";
import {
  countdownLabel,
  daysUntil,
  googleCalendarLink,
  isMatchPast,
  matchStart,
} from "@/lib/matches/schedule";

export type HomeMatch = {
  id: string;
  date: string;
  time?: string | null;
  opponent: string;
  result?: string | null;
  gender: "male" | "female";
  season: string;
  venues?: {
    venue_name: string;
    location_url?: string | null;
    location_type?: "home" | "away" | "outside_island";
  } | null;
};

const LOCATION_TAG = {
  home: { icon: faHouse, text: "En casa", className: "text-[var(--color-success)]" },
  away: { icon: faCarSide, text: "Fuera", className: "text-[var(--color-warning)]" },
  outside_island: { icon: faPlaneDeparture, text: "Viaje", className: "text-[var(--color-info)]" },
} as const;

function NextMatchCard({ match, now }: Readonly<{ match: HomeMatch; now: Date }>) {
  const start = matchStart(match.date, match.time);
  const days = daysUntil(match.date, now);
  const tag = match.venues?.location_type ? LOCATION_TAG[match.venues.location_type] : null;
  const weekday = start
    .toLocaleDateString("es-ES", { weekday: "short" })
    .replace(".", "");
  const month = start.toLocaleDateString("es-ES", { month: "short" }).replace(".", "");
  const hasTime = Boolean(match.time && /^\d{2}:\d{2}/.test(match.time));
  const time = hasTime ? match.time!.slice(0, 5) : null;
  const category = match.gender === "male" ? "Sénior Masculino" : "Sénior Femenino";

  const secondaryAction =
    "relative z-10 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--glass-border)] px-3.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]";

  return (
    <div className="@container">
      <article className="relative grid gap-x-6 gap-y-5 rounded-2xl border border-[var(--glass-border)] bg-[var(--color-bg-elevated)] p-4 @lg:grid-cols-[7rem_minmax(0,1fr)] @lg:p-5 @3xl:grid-cols-[7rem_minmax(0,1fr)_12.5rem] @3xl:items-center">
        <div className="flex items-center gap-4 @lg:flex-col @lg:items-stretch @lg:gap-3">
          <div className="flex w-20 flex-col items-center rounded-xl bg-[var(--surface-faint)] py-2.5 text-center ring-1 ring-inset ring-[var(--glass-border)] @lg:w-full">
            <span className="text-xs font-medium capitalize text-[var(--text-muted)]">{weekday}</span>
            <span className="text-4xl font-bold leading-none tabular-nums tracking-tight">
              {start.getDate()}
            </span>
            <span className="mt-0.5 text-xs capitalize text-[var(--text-secondary)]">{month}</span>
          </div>
          <div className="flex flex-col @lg:items-center">
            {time ? (
              <span className="text-2xl font-semibold leading-none tabular-nums @lg:text-xl">{time}</span>
            ) : (
              <span className="text-sm text-[var(--text-muted)]">Hora por confirmar</span>
            )}
            <span className="mt-1 text-sm font-semibold text-[var(--accent)]">
              {countdownLabel(days)}
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-[var(--text-secondary)]">
            <span>{category}</span>
            {tag ? (
              <span className={`inline-flex items-center gap-1.5 font-medium ${tag.className}`}>
                <FontAwesomeIcon icon={tag.icon} className="text-xs" aria-hidden />
                {tag.text}
              </span>
            ) : null}
          </p>
          <h3 className="mt-1 text-2xl font-bold tracking-tight text-balance @lg:text-3xl">
            <Link
              href={`/matches/${match.id}`}
              className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-[var(--accent)]"
            >
              {match.opponent}
            </Link>
          </h3>
          <p className="mt-2 flex items-start gap-2 text-sm text-[var(--text-secondary)]">
            <FontAwesomeIcon
              icon={faLocationDot}
              className="mt-0.5 shrink-0 text-[var(--accent)]"
              aria-hidden
            />
            <span>{match.venues?.venue_name || "Pabellón por confirmar"}</span>
          </p>
        </div>

        <div className="flex flex-col gap-2 @lg:col-span-2 @lg:flex-row @lg:flex-wrap @3xl:col-span-1 @3xl:flex-col">
          <span
            aria-hidden
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3.5 text-sm font-semibold text-white"
          >
            Ver partido
            <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
          </span>
          {match.venues?.location_url ? (
            <a
              href={match.venues.location_url}
              target="_blank"
              rel="noopener noreferrer"
              className={secondaryAction}
            >
              <FontAwesomeIcon icon={faLocationDot} className="text-xs" aria-hidden />
              Cómo llegar
            </a>
          ) : null}
          <a
            href={googleCalendarLink({
              opponent: match.opponent,
              date: match.date,
              time: match.time,
              venue: match.venues?.venue_name,
            })}
            target="_blank"
            rel="noopener noreferrer"
            className={secondaryAction}
          >
            <FontAwesomeIcon icon={faCalendarPlus} className="text-xs" aria-hidden />
            Añadir al calendario
          </a>
        </div>
      </article>
    </div>
  );
}

const EASE = [0.16, 1, 0.3, 1] as const;

export type HomeExtras = {
  videos: VideoListItem[];
  achievements: Achievement[];
  season: string;
  gender: string | null;
  roundup: Roundup | null;
  /** Solo para admins; el servidor no lo carga para el resto. */
  adminPending: AdminPendingData | null;
};

export default function HomeView({
  initialMatches,
  initialPayments,
  extras,
}: {
  extras: HomeExtras;
  initialMatches: HomeMatch[];
  initialPayments: {
    data: {
      user_id?: string | null;
      player_id?: string | null;
      concept?: string | null;
      amount: string | number;
      status: string;
      due_date?: string | null;
    }[];
    isAdmin: boolean;
    adminOverview?: {
      player_id: string;
      pendingAmount: number;
      overdueCount?: number;
    }[];
  } | null;
}) {
  const { user, loading } = useUser();
  const reduceMotion = useReducedMotion();
  const [matches] = useState<HomeMatch[]>(initialMatches);
  const [paymentsData] = useState(initialPayments);

  const now = new Date();

  const playedMatches = matches.filter((m) => isMatchPast(m.date, m.time, now));
  const upcomingMatches = matches
    .filter((m) => !isMatchPast(m.date, m.time, now))
    .sort((a, b) => +matchStart(a.date, a.time) - +matchStart(b.date, b.time));

  const nextMatch = upcomingMatches[0];

  const totalPlayed = playedMatches.length;
  const totalUpcoming = upcomingMatches.length;

  const wins = playedMatches.filter((m) => {
    if (!m.result) return false;
    const [us, them] = m.result.split("-").map(Number);
    return us > them;
  }).length;

  const pendingMatches = playedMatches.filter((m) => !m.result);

  const playedWithResult = playedMatches.filter((m) => m.result).length;

  const winRate =
    playedWithResult > 0 ? Math.round((wins / playedWithResult) * 100) : 0;

  const seasonTotal = totalPlayed + totalUpcoming;
  const playedShare =
    seasonTotal > 0 ? Math.min(100, (totalPlayed / seasonTotal) * 100) : 0;

  // Forma: últimos 5 partidos con marcador, del más antiguo al más reciente.
  const form = playedMatches
    .filter((m) => m.result)
    .slice(-5)
    .map((m) => {
      const [us, them] = String(m.result).split("-").map(Number);
      return { id: m.id, won: us > them, result: String(m.result), opponent: m.opponent };
    });

  if (loading) return <HomeSkeleton />;

  const pendingPayments =
    paymentsData?.data?.filter((p) => p.status === "pending") || [];
  const overduePayments = pendingPayments.filter((p) =>
    isQuotaOverdue("pending", p.due_date ?? null)
  );
  const nextDue = [...pendingPayments]
    .filter((p) => p.due_date)
    .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))[0];
  const totalPending = pendingPayments.reduce(
    (acc, p) => acc + Number(p.amount),
    0
  );
  const usersInDebt = paymentsData?.adminOverview
    ? paymentsData.adminOverview.filter((r) => r.pendingAmount > 0).length
    : new Set(
        pendingPayments.map((p) => p.player_id || p.user_id).filter(Boolean)
      ).size;
  const usersOverdue = paymentsData?.adminOverview
    ? paymentsData.adminOverview.filter((r) => (r.overdueCount ?? 0) > 0).length
    : overduePayments.length > 0
      ? 1
      : 0;
  const greeting =
    user?.gender === "female" ? "Bienvenida" : "Bienvenido";

  return (
    <motion.div
      className="flex w-full flex-col text-[var(--text-primary)]"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
    >
      <PageHeader
        title={`${greeting}, ${user?.user_name}`}
        subtitle="Resumen de la temporada en curso."
      />

      <div className="grid gap-8 lg:grid-cols-12 lg:gap-x-10 lg:gap-y-8">
        {/* ── Left column: next match + season ── */}
        <div className="flex flex-col gap-8 lg:col-span-7">
          <section>
            <h2 className="mb-3 text-lg font-semibold tracking-tight sm:text-xl">
              Próximo partido
            </h2>
            {nextMatch ? (
              <NextMatchCard match={nextMatch} now={now} />
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
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
                Tu temporada
              </h2>
              <Link
                href="/stats"
                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                Ver estadísticas
                <FontAwesomeIcon icon={faArrowRight} className="text-xs" aria-hidden />
              </Link>
            </div>

            <div className="grid gap-x-10 gap-y-5 border-t border-[var(--glass-border)] pt-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end">
              <div>
                <p className="text-5xl font-bold leading-none tabular-nums tracking-tight">
                  {winRate}
                  <span className="text-2xl font-semibold text-[var(--text-muted)]">%</span>
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  de victorias
                  <span className="text-[var(--text-muted)]">
                    {playedWithResult > 0
                      ? ` · ${wins} de ${playedWithResult}`
                      : " · aún sin resultados"}
                  </span>
                </p>
              </div>

              <div className="min-w-0">
                <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-[var(--text-secondary)]">Calendario</span>
                  <span className="tabular-nums text-[var(--text-muted)]">
                    {totalPlayed} jugados
                    {seasonTotal > 0 && (
                      <>
                        {" · "}
                        {totalUpcoming} restante{totalUpcoming === 1 ? "" : "s"}
                      </>
                    )}
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-[var(--progress-track)]"
                  role="img"
                  aria-label={`Progreso del calendario: ${Math.round(playedShare)} por ciento jugado`}
                >
                  <div
                    className="h-full bg-[var(--accent)] transition-[width] duration-500 ease-out"
                    style={{ width: `${playedShare}%` }}
                  />
                </div>
              </div>
            </div>

            {form.length > 0 ? (
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <span className="text-[var(--text-secondary)]">Forma</span>
                <ul className="flex items-center gap-1.5">
                  {form.map((f) => (
                    <li key={f.id}>
                      <span
                        title={`${f.won ? "Victoria" : "Derrota"} vs ${f.opponent} (${f.result})`}
                        className={`inline-flex size-7 items-center justify-center rounded-md text-xs font-bold ${
                          f.won ? "match-result-score--win" : "match-result-score--loss"
                        }`}
                      >
                        <span aria-hidden>{f.won ? "V" : "D"}</span>
                        <span className="sr-only">
                          {f.won ? "Victoria" : "Derrota"} vs {f.opponent}, {f.result}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        </div>

        {/* ── Columna derecha: lo que pide atención ── */}
        <div className="flex flex-col gap-8 lg:col-span-5">
          {user?.isAdmin && extras.adminPending ? (
            <AdminPending
              data={extras.adminPending}
              payments={
                paymentsData?.isAdmin
                  ? { usersInDebt, totalPending, usersOverdue }
                  : null
              }
              matchesWithoutResult={pendingMatches.map((m) => ({
                id: m.id,
                opponent: m.opponent,
                date: m.date,
              }))}
              now={now}
            />
          ) : paymentsData && !paymentsData.isAdmin ? (
            <PaymentsCard
              pendingCount={pendingPayments.length}
              overdueCount={overduePayments.length}
              total={totalPending}
              nextDue={nextDue?.due_date ? { concept: nextDue.concept, amount: nextDue.amount, due_date: String(nextDue.due_date) } : null}
            />
          ) : null}

          {!user?.isAdmin && extras.gender ? (
            <AchievementsGlance
              achievements={extras.achievements}
              season={extras.season}
              gender={extras.gender}
            />
          ) : null}

          {/* Escritorio: los vídeos ocupan el final de esta columna. */}
          <div className="hidden lg:block">
            <LatestVideos videos={extras.videos} compact />
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-10">
        {user?.isAdmin ? (
          (() => {
            const achievements = extras.gender ? (
              <AchievementsGlance
                achievements={extras.achievements}
                season={extras.season}
                gender={extras.gender}
              />
            ) : null;
            const birthdays = extras.adminPending?.birthdays ?? [];
            // Sin jornada que mostrar (inicio de temporada) los logros ocupan su sitio, sin dejar hueco.
            const left = extras.roundup ? <WeekendRoundup roundup={extras.roundup} /> : achievements;
            const right = (
              <>
                {extras.roundup ? achievements : null}
                <Birthdays birthdays={birthdays} />
              </>
            );
            const hasRight = Boolean(extras.roundup && achievements) || birthdays.length > 0;
            return (
              <div className="grid gap-10 lg:grid-cols-12 lg:gap-x-10">
                <div className={hasRight ? "lg:col-span-7" : "lg:col-span-12"}>{left}</div>
                {hasRight ? <div className="flex flex-col gap-10 lg:col-span-5">{right}</div> : null}
              </div>
            );
          })()
        ) : extras.roundup ? (
          <WeekendRoundup roundup={extras.roundup} />
        ) : null}

        <div className="lg:hidden">
          <LatestVideos videos={extras.videos} />
        </div>
      </div>
    </motion.div>
  );
}
