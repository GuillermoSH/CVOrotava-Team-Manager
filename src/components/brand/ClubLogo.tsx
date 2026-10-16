import Image from "next/image";
import { clubLogoSrc, type ClubLogoVariant } from "@/lib/brand/logo";

/** Presets alineados con Portal `Logo` (+ splash del login). */
export const clubLogoSizeClass = {
  nav: "size-7 sm:size-8",
  header: "size-16",
  splash: "size-36 sm:size-44",
} as const;

export type ClubLogoSize = keyof typeof clubLogoSizeClass;

const PRESET_PX: Record<ClubLogoSize, number> = {
  nav: 32,
  header: 64,
  splash: 176,
};

function LogoImage({
  variant,
  px,
  priority,
  alt,
}: {
  variant: ClubLogoVariant;
  px: number;
  priority: boolean;
  alt: string;
}) {
  return (
    <Image
      src={clubLogoSrc(px, variant)}
      alt={alt}
      fill
      sizes={`${px}px`}
      className="object-contain"
      priority={priority}
    />
  );
}

/**
 * Marca del club sin tile (como Portal). Claro/oscuro vía `data-theme` en `html`.
 */
export default function ClubLogo({
  size,
  priority = false,
  className,
  px,
  variant,
}: {
  size: ClubLogoSize;
  priority?: boolean;
  className?: string;
  /** Override del px de asset; por defecto según preset. */
  px?: number;
  /** Fuerza una sola variante; por defecto ambas según tema. */
  variant?: ClubLogoVariant;
}) {
  const displayPx = px ?? PRESET_PX[size];
  return (
    <div
      className={`relative shrink-0 ${className ?? clubLogoSizeClass[size]}`}
    >
      {variant ? (
        <LogoImage
          variant={variant}
          px={displayPx}
          priority={priority}
          alt="Club Voleibol Orotava"
        />
      ) : (
        <>
          <div className="club-logo--light absolute inset-0">
            <LogoImage
              variant="claro"
              px={displayPx}
              priority={priority}
              alt="Club Voleibol Orotava"
            />
          </div>
          <div className="club-logo--dark absolute inset-0" aria-hidden>
            <LogoImage
              variant="blanco"
              px={displayPx}
              priority={priority}
              alt=""
            />
          </div>
        </>
      )}
    </div>
  );
}
