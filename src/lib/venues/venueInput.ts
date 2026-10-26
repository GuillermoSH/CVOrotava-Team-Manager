import { z } from "zod";

export const createVenueSchema = z.object({
  venue_name: z.string().trim().min(2, "Indica el nombre del pabellón").max(120),
  /** Equipo o club local del pabellón (como en el resto de la lista). */
  team_name: z.string().trim().min(2, "Indica el equipo o club local").max(120),
  location_type: z.enum(["home", "away", "outside_island"]),
});

export type CreateVenueInput = z.infer<typeof createVenueSchema>;

/**
 * Un pabellón solo se borra si ningún partido lo usa: con partidos hay que fusionarlo en otro
 * (así no se pierde el sitio de ningún partido). Devuelve el motivo si no se puede.
 */
export function venueDeleteBlocker(matchesCount: number): string | null {
  if (matchesCount <= 0) return null;
  return `Tiene ${matchesCount} partido${matchesCount === 1 ? "" : "s"}: fusiónalo con otro pabellón en lugar de borrarlo.`;
}
