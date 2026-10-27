"use client";

import { useState } from "react";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay } from "@fortawesome/free-solid-svg-icons";
import { getThumbnailUrl } from "@/lib/youtube";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

type VideoThumbProps = {
  url: string;
  alt: string;
  size?: "mq" | "max";
  eager?: boolean;
  sizes?: string;
  className?: string;
  playClassName?: string;
};

/** YouTube thumb online; club-style mock when offline or when the image fails. */
export default function VideoThumb({
  url,
  alt,
  size = "max",
  eager = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw",
  className = "object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]",
  playClassName = "flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white backdrop-blur-sm",
}: Readonly<VideoThumbProps>) {
  const online = useOnlineStatus();
  const [imgFailed, setImgFailed] = useState(false);
  const showRemote = online && !imgFailed;
  const src = getThumbnailUrl(url, size);

  return (
    <>
      {showRemote ? (
        <Image
          src={src}
          alt={alt}
          fill
          loading={eager ? "eager" : "lazy"}
          sizes={sizes}
          className={className}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span
          aria-hidden
          className="absolute inset-0 bg-[#141418]"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at center, color-mix(in srgb, var(--accent) 18%, transparent), transparent 65%)",
          }}
        />
      )}
      <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/55 via-black/15 to-transparent md:from-transparent md:group-hover:from-black/45 md:group-hover:via-black/15">
        <span className={playClassName}>
          <FontAwesomeIcon icon={faPlay} className="ml-0.5 text-sm" />
        </span>
      </span>
    </>
  );
}
