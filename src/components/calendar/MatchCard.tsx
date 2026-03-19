"use client";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlaneDeparture,
  faCarSide,
  faHouse,
  faCalendarPlus,
  faVideo,
  faLocationDot,
  faPenToSquare,
} from "@fortawesome/free-solid-svg-icons";

export type Match = {
  id: string;
  date: string;
  time: string;
  opponent: string;
  season: string;
  result?: string;
  video_url?: string;
  notes?: string;
  gender: "male" | "female";
  venues: {
    id: string;
    venue_name: string;
    location_url?: string;
    location_type: "home" | "away" | "outside_island";
  };
};

export default function MatchCard({ match, isAdmin }: { match: Match; isAdmin?: boolean }) {
  const router = useRouter();

  const matchDate = new Date(`${match.date}T${match.time}`);
  const now = new Date();
  const matchEnd = new Date(matchDate.getTime() + 2 * 60 * 60 * 1000);
  const isPast = now > matchEnd;
  const isUpcoming = !isPast;

  // ── Determine card accent ──
  let accentColor = "var(--glass-border)";
  let pendingBadge = null;
  let cardBorderClass = "border-white/[0.06]";
  let opacityClass = "";

  if (isPast && !match.result) {
    accentColor = "var(--color-warning)";
    cardBorderClass = "border-yellow-500/20";
    opacityClass = "opacity-70";
    pendingBadge = <span className="badge badge-warning">Pte. resultado</span>;
  }

  if (match.result) {
    const [ourScore, theirScore] = match.result.split("-").map(Number);
    if (ourScore > theirScore) {
      accentColor = "var(--color-success)";
      cardBorderClass = "border-green-500/15";
    } else {
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

  // 📅 Google Calendar
  const startUTC = matchDate.toISOString().replace(/-|:|\.\d+/g, "");
  const endUTC = new Date(matchDate.getTime() + 2 * 60 * 60 * 1000)
    .toISOString()
    .replace(/-|:|\.\d+/g, "");
  const gcalLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    "Partido vs " + match.opponent
  )}&dates=${startUTC}/${endUTC}&details=${encodeURIComponent(
    match.notes || ""
  )}&location=${encodeURIComponent(match.venues.venue_name || "")}`;

  // 🏷️ Location tag
  const Tag = () => {
    const tagMap = {
      outside_island: { icon: faPlaneDeparture, text: "Viaje", cls: "badge-info" },
      away: { icon: faCarSide, text: "Fuera", cls: "badge-warning" },
      home: { icon: faHouse, text: "Casa", cls: "badge-success" },
    };
    const tag = tagMap[match.venues.location_type];
    if (!tag) return null;
    return (
      <span className={`badge ${tag.cls}`}>
        <FontAwesomeIcon icon={tag.icon} />
        {tag.text}
      </span>
    );
  };

  return (
    <div
      className={`relative rounded-2xl overflow-hidden flex flex-col justify-between border backdrop-blur-sm transition-all duration-300 bg-[var(--glass-surface)] hover:bg-[var(--glass-surface-hover)] hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 ${cardBorderClass} ${opacityClass}`}
    >
      {/* Accent side bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
        style={{ background: accentColor }}
      />

      <div className="relative z-10 p-5 space-y-3 pl-6">
        {/* Tags row */}
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Tag />
            {pendingBadge}
          </div>
          {isAdmin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/matches/edit/${match.id}`);
              }}
              className="btn-secondary !px-2 !py-1 !text-xs !gap-1"
            >
              <FontAwesomeIcon icon={faPenToSquare} className="text-[10px]" />
              Editar
            </button>
          )}
        </div>

        {/* Opponent */}
        <h2 className="text-lg font-semibold text-white tracking-tight leading-tight">
          {match.opponent}
        </h2>

        {/* Date & time */}
        <p className="text-sm text-[var(--text-muted)]">
          {formattedDate} • {formattedTime}
        </p>

        {/* Location */}
        {match.venues.location_url ? (
          <a
            href={match.venues.location_url}
            onClick={(e) => e.stopPropagation()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm text-[var(--text-secondary)] hover:text-[var(--accent-hover)] transition-colors"
          >
            <FontAwesomeIcon icon={faLocationDot} className="mr-1.5 text-red-400 text-xs" />
            {match.venues.venue_name}
          </a>
        ) : (
          <p className="text-sm text-[var(--text-secondary)] flex items-center">
            <FontAwesomeIcon icon={faLocationDot} className="mr-1.5 text-red-400 text-xs" />
            {match.venues.venue_name}
          </p>
        )}
      </div>

      {/* Bottom actions */}
      <div className="px-5 pb-5 pl-6 pt-1 flex flex-wrap justify-between items-end gap-2">
        <div className="flex gap-2">
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
                No disponible
              </span>
            )
          )}

          {isUpcoming && (
            <a
              href={gcalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary !text-xs !px-3 !py-1.5"
            >
              <FontAwesomeIcon icon={faCalendarPlus} />
              Calendario
            </a>
          )}
        </div>

        {/* Result */}
        {match.result && (
          <span
            className="font-bold text-2xl tabular-nums"
            style={{ color: accentColor }}
          >
            {match.result}
          </span>
        )}
      </div>
    </div>
  );
}
