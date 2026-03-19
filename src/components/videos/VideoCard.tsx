"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { getThumbnailUrl, getYoutubeTitle } from "@/lib/youtube";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay } from "@fortawesome/free-solid-svg-icons";
import { getDateByTimestampz } from "@/lib/videos";

type VideoCardProps = {
  url: string;
  created_at: string;
};

export default function VideoCard({
  url,
  created_at,
}: Readonly<VideoCardProps>) {
  const [title, setTitle] = useState<string>("");

  useEffect(() => {
    if (url) getYoutubeTitle(url).then((t) => setTitle(t || "Video"));
  }, [url]);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col relative overflow-hidden h-full rounded-xl border border-white/[0.06] bg-[var(--glass-surface)] transition-all duration-300 hover:border-white/15 hover:shadow-xl hover:shadow-black/30 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-red-500/50"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden">
        <Image
          src={getThumbnailUrl(url, "max")}
          alt={title || "Video"}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/50 via-black/10 to-transparent md:from-transparent md:via-transparent md:to-transparent md:group-hover:from-black/40 md:group-hover:via-black/15 transition-all duration-300">
          <div className="w-11 h-11 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 md:scale-75 md:group-hover:scale-100 transition-all duration-300 border border-white/20">
            <FontAwesomeIcon
              icon={faPlay}
              className="text-white text-sm ml-0.5"
            />
          </div>
        </div>

        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-[var(--accent)] to-transparent scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />
      </div>

      {/* Info */}
      <div className="p-3.5 flex-1 flex flex-col justify-between gap-1.5 pointer-events-none">
        <h2 className="text-sm text-white font-medium line-clamp-2 leading-snug">
          {title}
        </h2>
        <span className="text-xs text-[var(--text-muted)]">
          {getDateByTimestampz(created_at)}
        </span>
      </div>
    </a>
  );
}
