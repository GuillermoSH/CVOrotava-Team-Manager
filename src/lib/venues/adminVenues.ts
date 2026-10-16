import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAll } from "@/lib/supabase/fetchAll";
import { findVenueByName, sameVenueName } from "./venueNames";
import { clubVenueHints, type ClubHint, type VenueLocationType } from "./clubHints";

export type LocationType = VenueLocationType;

export type AdminVenue = {
  id: string;
  venue_name: string;
  team_name: string;
  location_type: LocationType;
  needs_review: boolean;
  matches_count: number;
  /** Nombres con los que la federación publica este pabellón. */
  aliases: string[];
  /** Solo en pendientes: venue revisado que parece el mismo sitio (por nombre). */
  suggestion: { id: string; venue_name: string; location_type: LocationType } | null;
  /** Solo en pendientes sin sugerencia por nombre: un club que juega de local en ambos. */
  clubHint: ClubHint | null;
};

/** venue → club → partidos de local de ese club en ese venue (vía los pabellones federados enlazados). */
async function loadHomeClubs(supabase: SupabaseClient) {
  const [aliases, matches, teams, clubs] = await Promise.all([
    fetchAll<{ fed_facility_id: number; venue_id: string }>((a, b) =>
      supabase.from("venue_fed_facilities").select("fed_facility_id, venue_id").range(a, b)
    ),
    fetchAll<{ facility_id: number; home_team_id: number | null }>((a, b) =>
      supabase.from("fed_matches").select("facility_id, home_team_id").not("facility_id", "is", null).range(a, b)
    ),
    fetchAll<{ id: number; club_id: number | null }>((a, b) =>
      supabase.from("fed_teams").select("id, club_id").not("club_id", "is", null).range(a, b)
    ),
    fetchAll<{ id: number; name: string }>((a, b) => supabase.from("fed_clubs").select("id, name").range(a, b)),
  ]);

  const venueOfFacility = new Map(aliases.map((x) => [x.fed_facility_id, x.venue_id]));
  const clubOfTeam = new Map(teams.map((t) => [t.id, t.club_id as number]));
  const homeClubs = new Map<string, Map<number, number>>();
  for (const m of matches) {
    const venue = venueOfFacility.get(m.facility_id);
    const club = m.home_team_id === null ? undefined : clubOfTeam.get(m.home_team_id);
    if (!venue || club === undefined) continue;
    const perClub = homeClubs.get(venue) ?? new Map<number, number>();
    perClub.set(club, (perClub.get(club) ?? 0) + 1);
    homeClubs.set(venue, perClub);
  }
  return { homeClubs, clubName: new Map(clubs.map((c) => [c.id, c.name])) };
}

export async function listVenuesAdmin(supabase: SupabaseClient): Promise<AdminVenue[]> {
  const [{ data: venues, error }, aliases, matches] = await Promise.all([
    supabase
      .from("venues")
      .select("id, venue_name, team_name, location_type, needs_review")
      .order("venue_name"),
    fetchAll<{ venue_id: string; fed_facilities: unknown }>((a, b) =>
      supabase.from("venue_fed_facilities").select("venue_id, fed_facilities(name)").range(a, b)
    ),
    fetchAll<{ venue_id: string }>((a, b) =>
      supabase.from("matches").select("venue_id").not("venue_id", "is", null).range(a, b)
    ),
  ]);
  if (error) throw new Error(error.message);

  const uses = new Map<string, number>();
  for (const m of matches) uses.set(m.venue_id as string, (uses.get(m.venue_id as string) ?? 0) + 1);

  const aliasNames = new Map<string, Set<string>>();
  for (const a of aliases) {
    const fac = a.fed_facilities as unknown as { name: string } | null;
    if (!fac) continue;
    const set = aliasNames.get(a.venue_id as string) ?? new Set<string>();
    set.add(fac.name.trim());
    aliasNames.set(a.venue_id as string, set);
  }

  const rows = (venues ?? []).map((v) => ({
    id: v.id as string,
    venue_name: v.venue_name as string,
    team_name: v.team_name as string,
    location_type: v.location_type as LocationType,
    needs_review: Boolean(v.needs_review),
  }));
  const reviewed = rows.filter((r) => !r.needs_review);

  // Las consultas de clubes solo hacen falta si hay algo pendiente.
  const hints = rows.some((r) => r.needs_review)
    ? clubVenueHints({ venues: rows, ...(await loadHomeClubs(supabase)) })
    : new Map<string, ClubHint>();

  return rows.map((r) => {
    const target = r.needs_review ? findVenueByName(r.venue_name, reviewed) : null;
    return {
      ...r,
      matches_count: uses.get(r.id) ?? 0,
      aliases: [...(aliasNames.get(r.id) ?? [])].filter((n) => n !== r.venue_name.trim()).sort(),
      suggestion: target
        ? { id: target.id, venue_name: target.venue_name, location_type: target.location_type }
        : null,
      clubHint: target ? null : hints.get(r.id) ?? null,
    };
  });
}

export type MergeStep = { source: string; target: string; sourceName: string; targetName: string };

/**
 * Fusiones sugeridas para los pendientes:
 *  1. pendiente ≈ venue revisado → al revisado (hereda casa/fuera/viaje);
 *  2. pendientes ≈ entre sí → al primero (sigue pendiente, una sola fila a revisar).
 */
export function planVenueMerges(
  venues: Pick<AdminVenue, "id" | "venue_name" | "needs_review">[]
): MergeStep[] {
  const steps: MergeStep[] = [];
  const reviewed = venues.filter((v) => !v.needs_review);
  const leftovers: typeof venues = [];

  for (const v of venues.filter((x) => x.needs_review)) {
    const target = findVenueByName(v.venue_name, reviewed);
    if (target) steps.push({ source: v.id, target: target.id, sourceName: v.venue_name, targetName: target.venue_name });
    else leftovers.push(v);
  }

  const clusters: (typeof venues)[] = [];
  for (const v of leftovers) {
    const cluster = clusters.find((c) => sameVenueName(c[0].venue_name, v.venue_name));
    if (cluster) {
      steps.push({ source: v.id, target: cluster[0].id, sourceName: v.venue_name, targetName: cluster[0].venue_name });
      cluster.push(v);
    } else {
      clusters.push([v]);
    }
  }
  return steps;
}

export async function mergeVenues(supabase: SupabaseClient, source: string, target: string) {
  const { error } = await supabase.rpc("merge_venues", { source, target });
  if (error) throw new Error(error.message);
}
