import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAll } from "@/lib/supabase/fetchAll";

export type TournamentRow = { id: number; name: string };
export type RivalTeamRow = {
  tournament_id: number;
  club_id: number | null;
  is_our_club: boolean;
};
export type ClubRow = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  headquarter: string | null;
};

export type RivalClub = ClubRow & {
  /** Competiciones de la temporada en las que nos cruzamos con este club. */
  tournaments: string[];
};

const byName = (a: string, b: string) => a.localeCompare(b, "es", { sensitivity: "base" });

/** Clubes rivales de la temporada (sin los nuestros), con las competiciones que compartimos. */
export function groupRivalClubs(
  tournaments: TournamentRow[],
  teams: RivalTeamRow[],
  clubs: ClubRow[]
): RivalClub[] {
  const tournamentName = new Map(tournaments.map((t) => [t.id, t.name]));
  const clubById = new Map(clubs.map((c) => [c.id, c]));
  const shared = new Map<number, Set<string>>();

  for (const t of teams) {
    if (t.is_our_club || t.club_id === null) continue;
    const name = tournamentName.get(t.tournament_id);
    if (!name || !clubById.has(t.club_id)) continue;
    const set = shared.get(t.club_id) ?? new Set<string>();
    set.add(name);
    shared.set(t.club_id, set);
  }

  return [...shared]
    .map(([id, names]) => ({ ...clubById.get(id)!, tournaments: [...names].sort(byName) }))
    .sort((a, b) => byName(a.name, b.name));
}

/** Temporadas con torneos sincronizados, de la más reciente a la más antigua. */
export async function listContactSeasons(supabase: SupabaseClient): Promise<string[]> {
  const rows = await fetchAll<{ season: string }>((a, b) =>
    supabase.from("fed_tournaments").select("season").range(a, b)
  );
  return [...new Set(rows.map((r) => r.season))].sort().reverse();
}

/**
 * Contacto público (email, teléfono, sede) de los clubes contra los que competimos.
 * Solo admins: el llamador debe haber pasado `requireAdminPage`.
 */
export async function listRivalClubs(
  supabase: SupabaseClient,
  season: string
): Promise<RivalClub[]> {
  const tournaments = await fetchAll<TournamentRow>((a, b) =>
    supabase.from("fed_tournaments").select("id, name").eq("season", season).range(a, b)
  );
  if (tournaments.length === 0) return [];

  const teams = await fetchAll<RivalTeamRow>((a, b) =>
    supabase
      .from("fed_teams")
      .select("tournament_id, club_id, is_our_club")
      .in(
        "tournament_id",
        tournaments.map((t) => t.id)
      )
      .range(a, b)
  );

  const clubIds = [
    ...new Set(teams.filter((t) => !t.is_our_club && t.club_id !== null).map((t) => t.club_id!)),
  ];
  const clubs: ClubRow[] = [];
  for (let i = 0; i < clubIds.length; i += 100) {
    const rows = await fetchAll<ClubRow>((a, b) =>
      supabase
        .from("fed_clubs")
        .select("id, name, phone, email, headquarter")
        .in("id", clubIds.slice(i, i + 100))
        .range(a, b)
    );
    clubs.push(...rows);
  }

  return groupRivalClubs(tournaments, teams, clubs);
}
