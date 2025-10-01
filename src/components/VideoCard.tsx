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

export default function VideoCard({ url, created_at }: Readonly<VideoCardProps>) {
  const [title, setTitle] = useState<string>("");

  useEffect(() => {
    if (url) {
      getYoutubeTitle(url).then((t) => setTitle(t || "Video"));
    }
  }, [url]);

  return (
    <main className="border border-white/30 overflow-hidden bg-white/5 backdrop-blur-sm shadow-lg rounded-lg p-4 flex flex-col gap-2">
      <div className="w-full relative aspect-video">
        <Image
          src={getThumbnailUrl(url, "max")}
          alt={title || "Video"}
          fill
          className="object-cover rounded-md"
        />
      </div>
      <div className="flex flex-1 flex-col justify-between">
        <h2 className="text-md font-bold">{title}</h2>
        <div className="flex align-bottom justify-between">
          <h3 className="flex items-center text-sm font-bold text-white/50">
            {getDateByTimestampz(created_at)}
          </h3>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 text-md bg-[#E71F12] hover:bg-red-500 text-white rounded-lg transition"
          >
            <FontAwesomeIcon icon={faPlay} />
          </a>
        </div>
      </div>
    </main>
  );
}