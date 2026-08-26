"use client";

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlaneDeparture,
  faCarSide,
  faHouse,
  faCalendarPlus,
  faVideo,
  faLocationDot,
  faPenToSquare,
  faArrowRight,
} from "@fortawesome/free-solid-svg-icons";
import type { Match } from "./MatchCard.types";

export type { Match } from "./MatchCard.types";

function resultTone(match: Match): "win" | "loss" | "neutral" {
  if (!match.result) return "neutral";
  const [ourScore, theirScore] = match.result.split("-").map(Number);
  if (Number.isNaN(ourScore) || Number.isNaN(theirScore)) return "neutral";
  if (ourScore > theirScore) return "win";
  if (ourScore < theirScore) return "loss";
  return "neutral";
}

export default function MatchCard({
  match,
  isAdmin,
  onEdit,
}: {
  match: Match;
  isAdmin?: boolean;
  onEdit?: (match: Match) => void;
}) {
  const matchDate = new Date(`${match.date}T${match.time}`);
  const now = new Date();
  const matchEnd = new Date(matchDate.getTime() + 2 * 60 * 60 * 1000);
  const isPast = now > matchEnd;
  const isUpcoming = !isPast;
  const tone = resultTone(match);

  const dayNum = matchDate.getDate();
  const weekday = matchDate
    .toLocaleDateString("es-ES", { weekday: "short" })
    .replace(".", "")
    .replace(/^./, (c) => c.toUpperCase());
  const formattedTime = matchDate.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const startUTC = matchDate.toISOString().replace(/-|:|\.\d+/g, "");
  const endUTC = new Date(matchDate.getTime() + 2 * 60 * 60 * 1000)
    .toISOString()
    .replace(/-|:|\.\d+/g, "");
  const gcalLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    "Partido vs " + match.opponent
  )}&dates=${startUTC}/${endUTC}&details=${encodeURIComponent(
    match.notes || ""
  )}&location=${encodeURIComponent(match.venues.venue_name || "")}`;

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

  return (
    <article className="h-full rounded-2xl border border-[var(--glass-border)] bg-[var(--color-bg-elevated)] transition-colors hover:border-[var(--glass-border-hover)]">
      <div className="flex h-full gap-3 p-3.5">
        <Link
          href={`/matches/${match.id}`}
          className="flex w-14 shrink-0 flex-col items-center justify-center self-stretch rounded-xl bg-[var(--surface-faint)] py-2 text-center transition-colors hover:bg-[var(--accent-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          aria-label={`${weekday} ${dayNum}, ${formattedTime}. Abrir ficha vs ${match.opponent}`}
        >
          <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            {weekday}
          </span>
          <span className="mt-0.5 text-2xl font-bold tabular-nums leading-none tracking-tight text-[var(--text-primary)]">
            {dayNum}
          </span>
          <span className="mt-1 text-[0.7rem] tabular-nums text-[var(--text-secondary)]">
            {formattedTime}
          </span>
        </Link>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <Link
                  href={`/matches/${match.id}`}
                  className="truncate text-base font-semibold tracking-tight text-[var(--text-primary)] transition-colors hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  {match.opponent}
                </Link>
                {tag && (
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium ${tag.className}`}
                  >
                    <FontAwesomeIcon
                      icon={tag.icon}
                      className="text-[0.65rem]"
                    />
                    {tag.text}
                  </span>
                )}
                {isPast && !match.result && (
                  <span className="badge badge-warning !text-[0.65rem]">
                    Pte. resultado
                  </span>
                )}
                {!isPast && !match.result && (
                  <span className="text-xs font-medium text-[var(--color-success)]">
                    Próximo
                  </span>
                )}
              </div>
              <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                <FontAwesomeIcon
                  icon={faLocationDot}
                  className="shrink-0 text-[0.7rem] text-[var(--accent)]"
                />
                {match.venues.location_url ? (
                  <a
                    href={match.venues.location_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate transition-colors hover:text-[var(--accent-hover)]"
                  >
                    {match.venues.venue_name}
                  </a>
                ) : (
                  <span className="truncate">{match.venues.venue_name}</span>
                )}
              </p>
            </div>

            {match.result ? (
              <span
                className={`shrink-0 rounded-lg px-2 py-1 text-base font-bold tabular-nums ${scoreClass}`}
              >
                {match.result}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={`/matches/${match.id}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--accent-muted)] px-2.5 text-xs font-semibold text-[var(--accent)] transition-colors hover:bg-[var(--accent)] hover:text-white"
            >
              Ver detalles
              <FontAwesomeIcon icon={faArrowRight} className="text-[0.65rem]" />
            </Link>

            {match.video_url ? (
              <a
                href={match.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-surface)] hover:text-[var(--accent)]"
              >
                <FontAwesomeIcon icon={faVideo} />
                Vídeo
              </a>
            ) : null}

            {isUpcoming && (
              <a
                href={gcalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-surface)] hover:text-[var(--accent)]"
              >
                <FontAwesomeIcon icon={faCalendarPlus} />
                Guardar
              </a>
            )}

            {isAdmin && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(match)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-surface)] hover:text-[var(--accent)]"
              >
                <FontAwesomeIcon icon={faPenToSquare} />
                Editar
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
