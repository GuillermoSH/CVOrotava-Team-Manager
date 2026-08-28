"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getThumbnailUrl, getYoutubeTitle } from "@/lib/youtube";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { getDateByTimestampz } from "@/lib/videos";
import {
  VIDEO_TYPE_LABELS,
  type VideoType,
  type VideoMatchSummary,
} from "@/lib/videos/constants";
import { formatMatchDate } from "@/lib/matches/formatMatchLabel";

export type Video = {
  id: string;
  url: string;
  created_at: string;
  video_type: VideoType;
  season: string;
  gender: "male" | "female";
  match_id: string | null;
  match?: VideoMatchSummary | null;
};

type VideoCardProps = {
  video: Video;
  isAdmin?: boolean;
  onEdit?: (video: Video) => void;
};

function parseResult(result: string | null | undefined): {
  won: boolean | null;
  label: string;
} | null {
  if (!result) return null;
  const parts = result.split("-").map((n) => parseInt(n.trim(), 10));
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) return null;
  const [us, them] = parts;
  if (us === them) return { won: null, label: result };
  return { won: us > them, label: result };
}

export default function VideoCard({
  video,
  isAdmin,
  onEdit,
}: Readonly<VideoCardProps>) {
  const [youtubeTitle, setYoutubeTitle] = useState("");
  const linked = video.match;
  const resultChip = linked ? parseResult(linked.result) : null;

  useEffect(() => {
    if (!linked && video.url) {
      getYoutubeTitle(video.url).then((t) => setYoutubeTitle(t || "Vídeo"));
    }
  }, [video.url, linked]);

  const displayTitle = linked
    ? `vs ${linked.opponent}`
    : youtubeTitle || "Vídeo";

  const subtitle = linked
    ? formatMatchDate(linked.date)
    : getDateByTimestampz(video.created_at);

  const meta = [
    VIDEO_TYPE_LABELS[video.video_type],
    video.gender === "male" ? "Masculino" : "Femenino",
  ].join(" · ");

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-surface)] transition-[border-color,box-shadow,transform] duration-200 hover:border-[var(--glass-border-hover)] hover:shadow-[var(--shadow-card-hover)] sm:hover:-translate-y-0.5">
      <a
        href={video.url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block aspect-video overflow-hidden bg-[var(--color-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]"
      >
        <Image
          src={getThumbnailUrl(video.url, "max")}
          alt={displayTitle}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />

        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/55 via-black/15 to-transparent md:from-transparent md:group-hover:from-black/45 md:group-hover:via-black/15">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white backdrop-blur-sm md:scale-90 md:opacity-0 md:transition-all md:duration-200 md:group-hover:scale-100 md:group-hover:opacity-100">
            <FontAwesomeIcon icon={faPlay} className="ml-0.5 text-sm" />
          </span>
        </div>

        <span className="absolute bottom-2 left-2 rounded-md border border-white/15 bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/95 backdrop-blur-sm">
          {VIDEO_TYPE_LABELS[video.video_type]}
        </span>

        {resultChip && (
          <span
            className={`absolute top-2 left-2 rounded-md border px-1.5 py-0.5 text-[10px] font-bold tabular-nums backdrop-blur-sm ${
              resultChip.won === true
                ? "border-emerald-400/30 bg-emerald-500/80 text-white"
                : resultChip.won === false
                  ? "border-red-400/30 bg-red-500/80 text-white"
                  : "border-white/20 bg-black/55 text-white"
            }`}
          >
            {resultChip.label}
          </span>
        )}
      </a>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <h2 className="line-clamp-2 text-sm font-medium leading-snug text-[var(--text-primary)]">
          {!linked && !youtubeTitle ? (
            <span className="inline-block h-3.5 w-3/4 animate-pulse rounded bg-[var(--surface-faint)]" />
          ) : (
            displayTitle
          )}
        </h2>
        <p className="text-[11px] leading-snug text-[var(--text-muted)]">
          {meta}
        </p>
        <p className="text-xs tabular-nums text-[var(--text-muted)]">
          {subtitle}
        </p>
        {video.match_id && (
          <Link
            href={`/matches/${video.match_id}`}
            className="mt-auto text-xs font-medium text-[var(--accent)] hover:underline"
          >
            Ver partido →
          </Link>
        )}
      </div>

      {isAdmin && (
        <button
          type="button"
          aria-label={`Editar ${displayTitle}`}
          className="absolute top-2.5 right-2.5 z-[1] inline-flex min-h-9 min-w-9 cursor-pointer touch-manipulation items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-black/55 px-2.5 text-xs font-medium text-white backdrop-blur-sm transition-opacity hover:bg-black/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
          onClick={() => onEdit?.(video)}
        >
          <FontAwesomeIcon icon={faPenToSquare} />
          <span className="sm:inline">Editar</span>
        </button>
      )}
    </article>
  );
}
