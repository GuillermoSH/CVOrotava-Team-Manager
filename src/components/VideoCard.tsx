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
      className="group block relative overflow-hidden rounded-xl border border-white/10 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-red-500"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden">
        <Image
          src={getThumbnailUrl(url, "max")}
          alt={title || "Video"}
          fill
          className="object-cover transition-transform duration-500 md:group-hover:scale-105"
        />

        {/* Overlay + Play Icon (sutil) */}
        <div
          className={`
            absolute inset-0 flex items-center justify-center 
            bg-black/30 md:bg-black/0 md:group-hover:bg-black/30 
            transition-colors duration-300
          `}
        >
          <FontAwesomeIcon
            icon={faPlay}
            className="text-white/60 text-3xl opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300"
          />
        </div>
        {/* Borde rojo dinámico (inferior) */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-transparent scale-x-0 md:group-hover:scale-x-100 origin-left transition-transform duration-500"></div>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1 pointer-events-none">
        <h2 className="text-sm font-semibold line-clamp-2">{title}</h2>
        <span className="text-xs text-white/40">
          {getDateByTimestampz(created_at)}
        </span>
      </div>
    </a>
  );
}
