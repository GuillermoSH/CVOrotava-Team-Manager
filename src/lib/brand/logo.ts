export const CLUB_LOGO_TILE_BG = "#141418";

export const CLUB_LOGO_SIZES = [32, 64, 128, 192, 256, 512] as const;
export type ClubLogoFileSize = (typeof CLUB_LOGO_SIZES)[number];

export type ClubLogoVariant = "blanco" | "negro";

/** Pick the public WebP whose pixel size covers `displayPx` at 2x. */
export function clubLogoSrc(
  displayPx: number,
  variant: ClubLogoVariant = "blanco"
): string {
  const need = Math.ceil(displayPx * 2);
  const size =
    CLUB_LOGO_SIZES.find((s) => s >= need) ?? CLUB_LOGO_SIZES[CLUB_LOGO_SIZES.length - 1];
  return `/assets/imgs/logo_${variant}_${size}.webp`;
}

export function clubLogoSrcSet(variant: ClubLogoVariant = "blanco"): string {
  return CLUB_LOGO_SIZES.map(
    (s) => `/assets/imgs/logo_${variant}_${s}.webp ${s}w`
  ).join(", ");
}
