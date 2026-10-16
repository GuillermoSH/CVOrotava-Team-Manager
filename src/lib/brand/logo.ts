const LOGO_SIZES = [32, 64, 128, 192, 256, 512] as const;
export type ClubLogoVariant = "blanco" | "claro";

/** Elige el asset @2x más pequeño que cubra `displayPx` (logos Portal en `/logo`). */
export function clubLogoSrc(
  displayPx: number,
  variant: ClubLogoVariant = "blanco"
): string {
  const need = Math.ceil(displayPx * 2);
  const size = LOGO_SIZES.find((s) => s >= need) ?? LOGO_SIZES[LOGO_SIZES.length - 1];
  return `/logo/logo_${variant}_${size}.webp`;
}
