"use client";

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { VIDEO_TYPE_LABELS, type VideoListItem } from "@/lib/videos/constants";
import { videoRecordedDate } from "@/lib/videos/date";
import { videoTitle } from "@/lib/videos/videoTitle";
import { formatMatchDate } from "@/lib/matches/formatMatchLabel";
import VideoThumb from "@/components/videos/VideoThumb";

export default function LatestVideos({
  videos,
  compact = false,
}: Readonly<{ videos: VideoListItem[]; /** Miniaturas pequeñas para una columna estrecha (3 en fila). */ compact?: boolean }>) {
  if (videos.length === 0) return null;
  return (
    <section className={compact ? undefined : "max-w-3xl"}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Últimos vídeos</h2>
        <Link
          href="/videos"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          Ver todos
          <FontAwesomeIcon icon={faArrowRight} className="text-xs" aria-hidden />
        </Link>
      </div>
      <ul
        className={
          compact
            ? "grid grid-cols-3 gap-x-3 gap-y-4"
            : "grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3"
        }
      >
        {videos.slice(0, 3).map((v, i) => {
          const title = videoTitle(v);
          return (
            <li key={v.id} className={`min-w-0 ${i === 2 && !compact ? "max-sm:hidden" : ""}`}>
              <a
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block focus-visible:outline-none"
              >
                <span className="relative block aspect-video overflow-hidden rounded-xl bg-[var(--surface-faint)] ring-1 ring-inset ring-[var(--glass-border)] group-focus-visible:ring-2 group-focus-visible:ring-[var(--accent)]">
                  <VideoThumb
                    url={v.url}
                    alt=""
                    size="mq"
                    sizes="(max-width: 640px) 50vw, 240px"
                    playClassName={`flex items-center justify-center rounded-full border border-white/25 bg-black/40 text-white backdrop-blur-sm ${compact ? "size-7" : "size-9"}`}
                  />
                  {v.match?.result ? (
                    <span className="absolute left-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-xs font-bold tabular-nums text-white">
                      {v.match.result}
                    </span>
                  ) : null}
                </span>
                <span
                  title={title}
                  className={`mt-2 block truncate font-medium group-hover:text-[var(--accent)] ${compact ? "text-xs" : "text-sm"}`}
                >
                  {title}
                </span>
                <span className={`block truncate text-[var(--text-muted)] ${compact ? "text-[0.7rem]" : "text-xs"}`}>
                  {VIDEO_TYPE_LABELS[v.video_type]} · {formatMatchDate(videoRecordedDate(v))}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
