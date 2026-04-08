"use client";

import type { ReactNode } from "react";
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
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import type { Match } from "./MatchCard.types";

export type { Match } from "./MatchCard.types";

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

  let accentColor = "var(--glass-border)";
  let pendingBadge: ReactNode = null;
  let cardBorderClass = "border-white/[0.06]";
  let opacityClass = "";

  if (isPast && !match.result) {
    accentColor = "var(--color-warning)";
    cardBorderClass = "border-yellow-500/20";
    opacityClass = "opacity-70";
    pendingBadge = (
      <span className="badge badge-warning shrink-0">Pte. resultado</span>
    );
  }

  if (match.result) {
    const parts = match.result.split("-").map(Number);
    const ourScore = parts[0];
    const theirScore = parts[1];
    if (
      !Number.isNaN(ourScore) &&
      !Number.isNaN(theirScore) &&
      ourScore > theirScore
    ) {
      accentColor = "var(--color-success)";
      cardBorderClass = "border-green-500/15";
    } else if (
      !Number.isNaN(ourScore) &&
      !Number.isNaN(theirScore) &&
      ourScore < theirScore
    ) {
      accentColor = "var(--color-danger)";
      cardBorderClass = "border-red-500/15";
    }
  }

  const formattedDate = matchDate
    .toLocaleDateString("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "2-digit",
    })
    .replace(/^./, (char) => char.toUpperCase());
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

  const Tag = () => {
    const tagMap = {
      outside_island: {
        icon: faPlaneDeparture,
        text: "Viaje",
        cls: "badge-info",
      },
      away: { icon: faCarSide, text: "Fuera", cls: "badge-warning" },
      home: { icon: faHouse, text: "Casa", cls: "badge-success" },
    } as const;
    const tag = tagMap[match.venues.location_type];
    if (!tag) return null;
    return (
      <span className={`badge ${tag.cls} shrink-0`}>
        <FontAwesomeIcon icon={tag.icon} />
        {tag.text}
      </span>
    );
  };

  const statusLabel = match.result
    ? "Finalizado"
    : isPast
      ? "Sin resultado"
      : "Próximo";

  return (
    <article
      className={`group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border backdrop-blur-sm transition-all duration-300 bg-[var(--glass-surface)] hover:bg-[var(--glass-surface-hover)] hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 ${cardBorderClass} ${opacityClass}`}
    >
      <div
        className="absolute left-0 top-0 bottom-0 z-0 w-[3px] rounded-l-2xl"
        style={{ background: accentColor }}
        aria-hidden
      />
      <Link
        href={`/matches/${match.id}`}
        scroll
        className="absolute inset-0 z-[1] rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
        aria-label={`Abrir ficha del partido contra ${match.opponent}`}
      />

      <div className="relative z-[2] space-y-3 p-5 pl-6 pointer-events-none">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <Tag />
            {pendingBadge}
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onEdit) onEdit(match);
              }}
              className="btn-secondary !px-2 !py-1 !text-xs !gap-1 pointer-events-auto relative z-[3] shrink-0"
            >
              <FontAwesomeIcon icon={faPenToSquare} className="text-[10px]" />
              Editar
            </button>
          )}
        </div>

        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Rival
          </p>
          <h2 className="mt-1 text-lg font-semibold leading-tight tracking-tight text-[var(--text-primary)]">
            {match.opponent}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--text-muted)]">
          <time dateTime={`${match.date}T${match.time}`}>
            {formattedDate} · {formattedTime}
          </time>
          <span className="text-[var(--text-muted)]" aria-hidden>
            ·
          </span>
          <span
            className={`rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium ${
              match.result
                ? "bg-[var(--progress-track)] text-[var(--text-secondary)]"
                : isPast
                  ? "match-status-pill--past bg-amber-500/15"
                  : "match-status-pill--upcoming bg-emerald-500/15"
            }`}
          >
            {statusLabel}
          </span>
        </div>

        {match.venues.location_url ? (
          <a
            href={match.venues.location_url}
            onClick={(e) => e.stopPropagation()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--accent-hover)] pointer-events-auto relative z-[3]"
          >
            <FontAwesomeIcon
              icon={faLocationDot}
              className="shrink-0 text-red-400 text-xs"
            />
            <span className="truncate">{match.venues.venue_name}</span>
          </a>
        ) : (
          <p className="flex max-w-full items-center gap-1.5 text-sm text-[var(--text-secondary)]">
            <FontAwesomeIcon
              icon={faLocationDot}
              className="shrink-0 text-red-400 text-xs"
            />
            <span className="truncate">{match.venues.venue_name}</span>
          </p>
        )}
      </div>

      <div className="relative z-[3] flex flex-wrap items-end justify-between gap-3 border-t border-[var(--glass-border)] bg-[var(--color-bg-card)] px-5 pb-4 pl-6 pt-3 pointer-events-none">
        <div className="flex flex-wrap gap-2 pointer-events-auto">
          {match.video_url ? (
            <a
              href={match.video_url}
              onClick={(e) => e.stopPropagation()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary !text-xs !px-3 !py-1.5"
            >
              <FontAwesomeIcon icon={faVideo} />
              Ver vídeo
            </a>
          ) : (
            isPast && (
              <span className="badge badge-neutral">
                <FontAwesomeIcon icon={faVideo} />
                Sin vídeo
              </span>
            )
          )}

          {isUpcoming && (
            <a
              href={gcalLink}
              onClick={(e) => e.stopPropagation()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary !text-xs !px-3 !py-1.5"
            >
              <FontAwesomeIcon icon={faCalendarPlus} />
              Calendario
            </a>
          )}
        </div>

        <div className="ml-auto flex flex-col items-end gap-1 text-right [&>*]:pointer-events-none">
          {match.result && (
            <span
              className="text-2xl font-bold tabular-nums leading-none"
              style={{ color: accentColor }}
            >
              {match.result}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[0.7rem] font-medium text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-secondary)]">
            Ver ficha
            <FontAwesomeIcon
              icon={faChevronRight}
              className="text-[10px] opacity-70 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
        </div>
      </div>
    </article>
  );
}
