import Image from "next/image";
import {
  CLUB_LOGO_TILE_BG,
  clubLogoSrc,
} from "@/lib/brand/logo";

const DIM = {
  nav: { box: "h-8 w-8 md:h-9 md:w-9", px: 36, radius: "rounded-lg" },
  header: { box: "h-16 w-16", px: 64, radius: "rounded-2xl" },
  splash: { box: "h-36 w-36 sm:h-44 sm:w-44", px: 176, radius: "rounded-2xl" },
} as const;

export type ClubLogoSize = keyof typeof DIM;

export default function ClubLogo({
  size,
  priority = false,
  className,
}: {
  size: ClubLogoSize;
  priority?: boolean;
  className?: string;
}) {
  const dim = DIM[size];
  return (
    <div
      className={`relative overflow-hidden border border-white/12 shadow-[0_1px_0_rgba(255,255,255,0.06)] ${dim.box} ${dim.radius} ${className ?? ""}`}
      style={{ backgroundColor: CLUB_LOGO_TILE_BG }}
    >
      <Image
        src={clubLogoSrc(dim.px)}
        alt="Club Voleibol Orotava"
        width={dim.px}
        height={dim.px}
        sizes={`${dim.px}px`}
        className="h-full w-full object-cover"
        priority={priority}
      />
    </div>
  );
}
