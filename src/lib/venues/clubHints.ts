/**
 * Pista para pabellones pendientes de revisar: si un club juega de local en un
 * pabellón nuevo y, en otras temporadas, jugaba de local en uno que ya hemos
 * revisado, probablemente sea el mismo sitio con otro nombre en la federación.
 * Es solo una sugerencia (el club puede usar dos pabellones): nunca se aplica sola.
 */

export type VenueLocationType = "home" | "away" | "outside_island";

export type ClubHint = {
  id: string;
  venue_name: string;
  location_type: VenueLocationType;
  club_name: string;
};

type HintVenue = {
  id: string;
  venue_name: string;
  needs_review: boolean;
  location_type: VenueLocationType;
};

export function clubVenueHints(input: {
  venues: HintVenue[];
  /** venue → club → nº de partidos de ese club como local en ese venue */
  homeClubs: Map<string, Map<number, number>>;
  clubName: Map<number, string>;
}): Map<string, ClubHint> {
  const reviewed = input.venues.filter((v) => !v.needs_review);
  const out = new Map<string, ClubHint>();

  for (const pending of input.venues.filter((v) => v.needs_review)) {
    const pendingClubs = input.homeClubs.get(pending.id);
    if (!pendingClubs) continue;

    let best: { venue: HintVenue; club: number; score: number } | null = null;
    for (const venue of reviewed) {
      const clubs = input.homeClubs.get(venue.id);
      if (!clubs) continue;
      for (const [club, nPending] of pendingClubs) {
        const nReviewed = clubs.get(club);
        if (!nReviewed) continue;
        const score = Math.min(nPending, nReviewed);
        if (!best || score > best.score) best = { venue, club, score };
      }
    }

    if (best) {
      out.set(pending.id, {
        id: best.venue.id,
        venue_name: best.venue.venue_name,
        location_type: best.venue.location_type,
        club_name: input.clubName.get(best.club) ?? "El mismo club",
      });
    }
  }
  return out;
}
