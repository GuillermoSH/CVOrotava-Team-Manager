import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { fetchAll } from "@/lib/supabase/fetchAll";
import { normalizeSeasonId } from "@/utils/getCurrentSeason";
import type { FedGroupRow, FedMatchRow, FedRoundRow, FedTeamRow, FedTournamentBundle } from "@/lib/fed/parse";
import { buildCompetitiveStats, type CompetitiveStats } from "./build";
import { seasonDataFromBundles } from "./fromBundles";
import { previousSeasonId, todayInCanarias } from "./seasons";
import type { Gender, SeasonData } from "./types";

type MatchWithSets = FedMatchRow & {
  fed_match_sets: { set_number: number; home_points: number; away_points: number }[];
};

/** Lee de las tablas `fed_*` una temporada y género y la deja en el formato del motor. */
export async function loadSeasonDataUncached(season: string, gender: Gender): Promise<SeasonData | null> {
  const { data: tournaments, error } = await supabaseAdmin
    .from("fed_tournaments")
    .select("id, name, season, gender, status")
    .eq("season", season);
  if (error) throw new Error(`fed_tournaments: ${error.message}`);
  if (!tournaments?.length) return null;
  const tournamentIds = tournaments.map((t) => t.id as number);

  const groups = await fetchAll<FedGroupRow>((a, b) =>
    supabaseAdmin
      .from("fed_groups")
      .select("id, tournament_id, name, type, sort_order, gender")
      .in("tournament_id", tournamentIds)
      .eq("gender", gender)
      .range(a, b)
  );
  if (groups.length === 0) return null;
  const groupIds = groups.map((g) => g.id);

  const [teams, rounds, matches] = await Promise.all([
    fetchAll<FedTeamRow>((a, b) =>
      supabaseAdmin
        .from("fed_teams")
        .select("id, tournament_id, name, is_our_club, club_id")
        .in("tournament_id", tournamentIds)
        .range(a, b)
    ),
    fetchAll<FedRoundRow>((a, b) =>
      supabaseAdmin.from("fed_rounds").select("id, group_id, name, sort_order").in("group_id", groupIds).range(a, b)
    ),
    fetchAll<MatchWithSets>((a, b) =>
      supabaseAdmin
        .from("fed_matches")
        .select(
          "id, tournament_id, group_id, round_id, home_team_id, away_team_id, facility_id, local_date, local_time, timezone, finished, canceled, postponed, rest, home_sets, away_sets, home_league_points, away_league_points, report_url, fed_updated_at, fed_match_sets(set_number, home_points, away_points)"
        )
        .in("group_id", groupIds)
        .range(a, b)
    ),
  ]);

  const bundles: FedTournamentBundle[] = tournaments.map((t) => {
    const tGroups = groups.filter((g) => g.tournament_id === t.id);
    const gids = new Set(tGroups.map((g) => g.id));
    const tMatches = matches.filter((m) => m.tournament_id === t.id);
    return {
      tournament: { id: t.id as number, name: t.name as string, season: t.season as string, gender: t.gender as "male" | "female" | "mixed", status: t.status as string },
      groups: tGroups,
      rounds: rounds.filter((r) => gids.has(r.group_id)),
      teams: teams.filter((x) => x.tournament_id === t.id),
      clubs: [],
      facilities: [],
      matches: tMatches,
      sets: tMatches.flatMap((m) => m.fed_match_sets.map((s) => ({ match_id: m.id, ...s }))),
    };
  });

  return seasonDataFromBundles(bundles, season, gender);
}

/** Los datos de la federación cambian una vez por semana: caché larga, y la sincronización la invalida con el tag `fed`. */
export const loadSeasonData = unstable_cache(loadSeasonDataUncached, ["fed-season-data"], {
  revalidate: 3600,
  tags: ["fed"],
});

export async function getCompetitiveStats(
  seasonRaw: string,
  gender: Gender,
  today: string = todayInCanarias()
): Promise<CompetitiveStats> {
  const season = normalizeSeasonId(seasonRaw);
  const prevId = previousSeasonId(season);
  const [current, previous] = await Promise.all([
    loadSeasonData(season, gender),
    prevId ? loadSeasonData(prevId, gender) : Promise.resolve(null),
  ]);
  return buildCompetitiveStats({
    current: current ?? { season, gender, groups: [], teams: [], matches: [] },
    previous,
    today,
  });
}
