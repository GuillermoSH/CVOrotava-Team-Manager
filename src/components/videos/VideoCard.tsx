"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getThumbnailUrl, getYoutubeTitle } from "@/lib/youtube";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { getDateByTimestampz } from "@/lib/videos";

export type Video = {
  id: string;
  url: string;
  created_at: string;
  category: "match" | "training";
  season: string;
  competition_type: "league" | "friendly";
  gender: "male" | "female";
};

type VideoCardProps = {
  video: Video;
  isAdmin?: boolean;
  onEdit?: (video: Video) => void;
};

const CATEGORY_LABEL: Record<Video["category"], string> = {
  match: "Partido",
  training: "Entrenamiento",
};

const COMP_LABEL: Record<Video["competition_type"], string> = {
  league: "Liga",
  friendly: "Amistoso",
};

export default function VideoCard({
  video,
  isAdmin,
  onEdit,
}: Readonly<VideoCardProps>) {
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (video.url) {
      getYoutubeTitle(video.url).then((t) => setTitle(t || "Vídeo"));
    }
  }, [video.url]);

  const meta = [
    CATEGORY_LABEL[video.category],
    COMP_LABEL[video.competition_type],
    video.gender === "male" ? "Masculino" : "Femenino",
  ].join(" · ");

  return (
    <article className="group relative h-full">
      <a
        href={video.url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-surface)] transition-[border-color,box-shadow,transform] duration-200 hover:border-[var(--glass-border-hover)] hover:shadow-[var(--shadow-card-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] active:scale-[0.99] sm:hover:-translate-y-0.5"
      >
        <div className="relative aspect-video overflow-hidden bg-[var(--color-bg)]">
          <Image
            src={getThumbnailUrl(video.url, "max")}
            alt={title || "Miniatura del vídeo"}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />

          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/55 via-black/15 to-transparent md:from-transparent md:via-transparent md:to-transparent md:group-hover:from-black/45 md:group-hover:via-black/15">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white backdrop-blur-sm md:scale-90 md:opacity-0 md:transition-all md:duration-200 md:group-hover:scale-100 md:group-hover:opacity-100">
              <FontAwesomeIcon icon={faPlay} className="ml-0.5 text-sm" />
            </span>
          </div>

          <span className="absolute bottom-2 left-2 rounded-md border border-white/15 bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/95 backdrop-blur-sm">
            {CATEGORY_LABEL[video.category]}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-1.5 p-3.5 pointer-events-none">
          <h2 className="line-clamp-2 text-sm font-medium leading-snug text-[var(--text-primary)]">
            {title || (
              <span className="inline-block h-3.5 w-3/4 animate-pulse rounded bg-[var(--surface-faint)]" />
            )}
          </h2>
          <p className="text-[11px] leading-snug text-[var(--text-muted)]">
            {meta}
          </p>
          <time
            dateTime={video.created_at}
            className="mt-auto text-xs tabular-nums text-[var(--text-muted)]"
          >
            {getDateByTimestampz(video.created_at)}
          </time>
        </div>
      </a>

      {isAdmin && (
        <button
          type="button"
          aria-label={`Editar ${title || "vídeo"}`}
          className="absolute top-2.5 right-2.5 z-[1] inline-flex min-h-9 min-w-9 cursor-pointer touch-manipulation items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-black/55 px-2.5 text-xs font-medium text-white backdrop-blur-sm transition-opacity hover:bg-black/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit?.(video);
          }}
        >
          <FontAwesomeIcon icon={faPenToSquare} />
          <span className="sm:inline">Editar</span>
        </button>
      )}
    </article>
  );
}
