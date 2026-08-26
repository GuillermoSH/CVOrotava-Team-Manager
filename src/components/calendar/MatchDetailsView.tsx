"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faCalendarPlus,
  faCarSide,
  faHouse,
  faLocationDot,
  faPenToSquare,
  faPlaneDeparture,
  faPlay,
  faVideo,
} from "@fortawesome/free-solid-svg-icons";
import { useUser } from "@/contexts/UserContext";
import MatchModal, { MatchFormValues } from "@/components/calendar/MatchModal";
import type { Match } from "@/components/calendar/MatchCard";
import { matchToModalInitialValues } from "@/lib/matchFormValues";
import { getThumbnailUrl, getYouTubeId } from "@/lib/youtube";

export type MatchDetail = Match & {
  match_sets?: Array<{
    id: string;
    set_number: number;
    team_score: number;
    opponent_score: number;
  }>;
};

const EASE = [0.16, 1, 0.3, 1] as const;

function resultTone(match: Match): "win" | "loss" | "neutral" {
  if (!match.result) return "neutral";
  const [ourScore, theirScore] = match.result.split("-").map(Number);
  if (Number.isNaN(ourScore) || Number.isNaN(theirScore)) return "neutral";
  if (ourScore > theirScore) return "win";
  if (ourScore < theirScore) return "loss";
  return "neutral";
}

export default function MatchDetailsView({
  match: initialMatch,
}: {
  match: MatchDetail;
}) {
  const { user } = useUser();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [match, setMatch] = useState(initialMatch);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MatchFormValues | undefined>(
    undefined
  );

  useEffect(() => {
    setMatch(initialMatch);
  }, [initialMatch]);

  const matchDate = useMemo(
    () => new Date(`${match.date}T${match.time}`),
    [match.date, match.time]
  );
  const matchEnd = new Date(matchDate.getTime() + 2 * 60 * 60 * 1000);
  const isPast = Date.now() > matchEnd.getTime();
  const isUpcoming = !isPast;
  const tone = resultTone(match);

  const startUTC = matchDate.toISOString().replace(/-|:|\.\d+/g, "");
  const endUTC = new Date(matchDate.getTime() + 2 * 60 * 60 * 1000)
    .toISOString()
    .replace(/-|:|\.\d+/g, "");
  const gcalLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    "Partido vs " + match.opponent
  )}&dates=${startUTC}/${endUTC}&details=${encodeURIComponent(
    match.notes || ""
  )}&location=${encodeURIComponent(match.venues.venue_name || "")}`;

  const sortedSets = [...(match.match_sets || [])].sort(
    (a, b) => a.set_number - b.set_number
  );

  const youtubeId = match.video_url ? getYouTubeId(match.video_url) : null;
  const thumbUrl =
    match.video_url && youtubeId
      ? getThumbnailUrl(match.video_url, "max")
      : "";

  const genderLabel =
    match.gender === "male" ? "Sénior Masculino" : "Sénior Femenino";

  const dateLine = matchDate.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const dateDisplay = dateLine.charAt(0).toUpperCase() + dateLine.slice(1);
  const formattedTime = match.time?.slice(0, 5) || null;

  const statusLabel = match.result
    ? "Disputado"
    : isPast
      ? "Resultado pendiente"
      : "Próximo";

  const tagMap = {
    outside_island: {
      icon: faPlaneDeparture,
      text: "Viaje",
      className: "text-[var(--color-info)]",
    },
    away: {
      icon: faCarSide,
      text: "Fuera",
      className: "text-[var(--color-warning)]",
    },
    home: {
      icon: faHouse,
      text: "Casa",
      className: "text-[var(--color-success)]",
    },
  } as const;
  const tag = tagMap[match.venues.location_type];

  const scoreClass =
    tone === "win"
      ? "match-result-score--win"
      : tone === "loss"
        ? "match-result-score--loss"
        : "text-[var(--text-muted)]";

  const refreshMatch = async () => {
    const res = await fetch(`/api/matches/${match.id}`, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as MatchDetail;
      setMatch(data);
    }
    router.refresh();
  };

  const hasExtras =
    sortedSets.length > 0 || Boolean(match.notes) || Boolean(match.video_url);

  return (
    <>
      <motion.div
        className="flex w-full flex-col text-[var(--text-primary)]"
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE }}
      >
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/matches"
            className="group inline-flex items-center gap-2.5 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <FontAwesomeIcon
              icon={faArrowLeft}
              className="text-xs transition-transform group-hover:-translate-x-0.5"
            />
            Volver al calendario
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {isUpcoming && (
              <a
                href={gcalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary inline-flex items-center gap-2 text-sm"
              >
                <FontAwesomeIcon icon={faCalendarPlus} />
                Añadir al calendario
              </a>
            )}
            {user?.isAdmin && (
              <button
                type="button"
                className="btn-primary inline-flex items-center gap-2 text-sm"
                onClick={() => {
                  setEditing(matchToModalInitialValues(match));
                  setModalOpen(true);
                }}
              >
                <FontAwesomeIcon icon={faPenToSquare} />
                Editar partido
              </button>
            )}
          </div>
        </div>

        <header className="mb-10 border-b border-[var(--glass-border)] pb-8 lg:mb-12 lg:pb-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.5rem]">
                {match.opponent}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--text-muted)]">
                {tag && (
                  <span
                    className={`inline-flex items-center gap-1.5 font-medium ${tag.className}`}
                  >
                    <FontAwesomeIcon
                      icon={tag.icon}
                      className="text-[0.7rem]"
                    />
                    {tag.text}
                  </span>
                )}
                <span aria-hidden>·</span>
                <span
                  className={
                    isPast && !match.result
                      ? "font-medium text-[var(--color-warning)]"
                      : !isPast && !match.result
                        ? "font-medium text-[var(--color-success)]"
                        : "text-[var(--text-secondary)]"
                  }
                >
                  {statusLabel}
                </span>
                <span aria-hidden>·</span>
                <span>{genderLabel}</span>
                <span aria-hidden>·</span>
                <span>{match.season}</span>
              </div>
              <p className="mt-4 text-sm text-[var(--text-secondary)] sm:text-[0.95rem]">
                {dateDisplay}
                {formattedTime ? (
                  <span className="tabular-nums text-[var(--text-primary)]">
                    {" "}
                    · {formattedTime}
                  </span>
                ) : (
                  <span className="text-[var(--color-warning)]"> · Sin hora</span>
                )}
              </p>
              <p className="mt-2 flex min-w-0 items-center gap-1.5 text-sm text-[var(--text-muted)]">
                <FontAwesomeIcon
                  icon={faLocationDot}
                  className="shrink-0 text-[0.7rem] text-[var(--accent)]"
                />
                {match.venues.location_url ? (
                  <a
                    href={match.venues.location_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate transition-colors hover:text-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  >
                    {match.venues.venue_name}
                  </a>
                ) : (
                  <span className="truncate">
                    {match.venues.venue_name || "Sin pabellón asignado"}
                  </span>
                )}
              </p>
            </div>

            <div className="shrink-0 sm:text-right">
              {match.result ? (
                <p
                  className={`inline-flex rounded-xl px-3 py-1.5 text-4xl font-bold tabular-nums tracking-tight sm:text-5xl ${scoreClass}`}
                >
                  {match.result}
                </p>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">
                  {isPast
                    ? "Resultado aún sin registrar"
                    : "Marcador pendiente"}
                </p>
              )}
            </div>
          </div>
        </header>

        {!hasExtras ? (
          <p className="text-sm text-[var(--text-muted)]">
            Sin sets, vídeo ni notas para este partido.
          </p>
        ) : (
          <div className="flex flex-col gap-10 lg:gap-12">
            {(match.video_url || sortedSets.length > 0) && (
              <div
                className={`grid gap-8 lg:gap-10 ${
                  match.video_url && sortedSets.length > 0
                    ? "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-start"
                    : ""
                }`}
              >
                {match.video_url && (
                  <section className="min-w-0">
                    <h2 className="mb-4 text-lg font-semibold tracking-tight">
                      Vídeo
                    </h2>
                    {thumbUrl ? (
                      <a
                        href={match.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative block aspect-video w-full overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                      >
                        <Image
                          src={thumbUrl}
                          alt={`Vídeo del partido contra ${match.opponent}`}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                          sizes="(max-width: 1024px) 100vw, 55vw"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors group-hover:bg-black/35">
                          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
                            <FontAwesomeIcon
                              icon={faPlay}
                              className="ml-0.5 text-sm"
                            />
                          </span>
                        </div>
                      </a>
                    ) : (
                      <a
                        href={match.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)]"
                      >
                        <FontAwesomeIcon icon={faVideo} />
                        Ver vídeo
                      </a>
                    )}
                  </section>
                )}

                {sortedSets.length > 0 && (
                  <section className="min-w-0">
                    <h2 className="mb-4 text-lg font-semibold tracking-tight">
                      Sets
                    </h2>
                    <ul className="divide-y divide-[var(--glass-border)]">
                      {sortedSets.map((s) => {
                        const won = s.team_score > s.opponent_score;
                        const lost = s.team_score < s.opponent_score;
                        return (
                          <li
                            key={s.id}
                            className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                          >
                            <span className="text-sm text-[var(--text-muted)]">
                              Set {s.set_number}
                            </span>
                            <span
                              className={`rounded-lg px-2 py-0.5 text-base font-bold tabular-nums sm:text-lg ${
                                won
                                  ? "match-result-score--win"
                                  : lost
                                    ? "match-result-score--loss"
                                    : "text-[var(--text-secondary)]"
                              }`}
                            >
                              {s.team_score} — {s.opponent_score}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}
              </div>
            )}

            {match.notes && (
              <section>
                <h2 className="mb-3 text-lg font-semibold tracking-tight">
                  Notas
                </h2>
                <p className="max-w-prose whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--text-secondary)]">
                  {match.notes}
                </p>
              </section>
            )}
          </div>
        )}
      </motion.div>

      {user?.isAdmin && (
        <MatchModal
          isOpen={modalOpen}
          initialData={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(undefined);
          }}
          onSuccess={refreshMatch}
        />
      )}
    </>
  );
}
