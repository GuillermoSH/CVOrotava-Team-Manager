import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { fetchAll } from "@/lib/supabase/fetchAll";
import { getCurrentSeason } from "@/utils/getCurrentSeason";
import { todayInCanarias } from "@/lib/stats/competitive/seasons";
import {
  buildCompetition,
  type Competition,
  type CompetitionGroup,
  type CompetitionInput,
  type CompetitionMatch,
  type CompetitionRound,
  type Gender,
} from "./build";

type MatchRow = Omit<CompetitionInput["matches"][number], "facility_name" | "sets"> & {
  fed_facilities: { name: string } | { name: string }[] | null;
  fed_match_sets: CompetitionInput["matches"][number]["sets"];
};

/** Lee de las tablas `fed_*` la competición de una temporada y género (todos los grupos, todos los equipos). */
async function loadCompetitionInput(season: string, gender: Gender): Promise<CompetitionInput | null> {
  const { data: tournaments, error } = await supabaseAdmin
    .from("fed_tournaments")
    .select("id")
    .eq("season", season);
  if (error) throw new Error(`fed_tournaments: ${error.message}`);
  if (!tournaments?.length) return null;
  const tournamentIds = tournaments.map((t) => t.id as number);

  const groups = await fetchAll<CompetitionInput["groups"][number]>((a, b) =>
    supabaseAdmin
      .from("fed_groups")
      .select("id, name, type, sort_order")
      .in("tournament_id", tournamentIds)
      .eq("gender", gender)
      .range(a, b)
  );
  if (groups.length === 0) return null;
  const groupIds = groups.map((g) => g.id);

  const [rounds, teams, matches] = await Promise.all([
    fetchAll<CompetitionInput["rounds"][number]>((a, b) =>
      supabaseAdmin.from("fed_rounds").select("id, group_id, name, sort_order").in("group_id", groupIds).range(a, b)
    ),
    fetchAll<CompetitionInput["teams"][number]>((a, b) =>
      supabaseAdmin
        .from("fed_teams")
        .select("id, name, club_id, is_our_club")
        .in("tournament_id", tournamentIds)
        .range(a, b)
    ),
    fetchAll<MatchRow>((a, b) =>
      supabaseAdmin
        .from("fed_matches")
        .select(
          "id, group_id, round_id, home_team_id, away_team_id, local_date, local_time, finished, canceled, postponed, rest, home_sets, away_sets, home_league_points, away_league_points, report_url, fed_facilities(name), fed_match_sets(set_number, home_points, away_points)"
        )
        .in("group_id", groupIds)
        .range(a, b)
    ),
  ]);

  return {
    season,
    gender,
    groups,
    rounds,
    teams,
    matches: matches.map(({ fed_facilities, fed_match_sets, ...m }) => {
      const facility = Array.isArray(fed_facilities) ? fed_facilities[0] : fed_facilities;
      return { ...m, facility_name: facility?.name?.trim() || null, sets: fed_match_sets ?? [] };
    }),
  };
}

/** Datos crudos cacheados: cambian una vez por semana y la sincronización invalida el tag `fed`. */
const loadCompetitionInputCached = unstable_cache(loadCompetitionInput, ["fed-competition-input"], {
  revalidate: 3600,
  tags: ["fed"],
});

export async function getCompetition(
  season: string,
  gender: Gender,
  today: string = todayInCanarias()
): Promise<Competition | null> {
  const input = await loadCompetitionInputCached(season, gender);
  return input ? buildCompetition(input, today) : null;
}

/** Temporadas con datos de la federación, de la más reciente a la más antigua; siempre incluye la actual. */
export const listCompetitionSeasons = unstable_cache(
  async (): Promise<string[]> => {
    const { data, error } = await supabaseAdmin.from("fed_tournaments").select("season");
    if (error) throw new Error(`fed_tournaments: ${error.message}`);
    const seasons = new Set<string>([getCurrentSeason()]);
    for (const row of data ?? []) if (row.season) seasons.add(row.season as string);
    return [...seasons].sort((a, b) => b.localeCompare(a));
  },
  ["fed-competition-seasons"],
  { revalidate: 3600, tags: ["fed"] }
);

export type FedMatchContext = {
  season: string;
  gender: Gender;
  competition: Competition;
  group: CompetitionGroup;
  round: CompetitionRound;
  match: CompetitionMatch;
  /** Nuestro partido enlazado a este de la federación (notas y vídeo son nuestros). */
  ours: { id: string; video_url: string | null; notes: string | null } | null;
};

/** Un partido de la federación con su competición, su grupo y su jornada; null si no existe. */
export async function getFedMatchContext(
  fedMatchId: number,
  today: string = todayInCanarias()
): Promise<FedMatchContext | null> {
  const { data: row, error } = await supabaseAdmin
    .from("fed_matches")
    .select("id, group_id, tournament_id")
    .eq("id", fedMatchId)
    .maybeSingle();
  if (error) throw new Error(`fed_matches: ${error.message}`);
  if (!row) return null;

  const [tournament, group] = await Promise.all([
    supabaseAdmin.from("fed_tournaments").select("season").eq("id", row.tournament_id).maybeSingle(),
    supabaseAdmin.from("fed_groups").select("gender").eq("id", row.group_id).maybeSingle(),
  ]);
  const season = tournament.data?.season as string | undefined;
  const gender = group.data?.gender as Gender | undefined;
  if (!season || (gender !== "male" && gender !== "female")) return null;

  const competition = await getCompetition(season, gender, today);
  const grp = competition?.groups.find((g) => g.id === row.group_id);
  const round = grp?.rounds.find((r) => r.matches.some((m) => m.id === fedMatchId));
  const match = round?.matches.find((m) => m.id === fedMatchId);
  if (!competition || !grp || !round || !match) return null;

  const { data: ours } = await supabaseAdmin
    .from("matches")
    .select("id, video_url, notes")
    .eq("fed_match_id", fedMatchId)
    .maybeSingle();

  return {
    season,
    gender,
    competition,
    group: grp,
    round,
    match,
    ours: ours ? { id: ours.id as string, video_url: (ours.video_url as string | null) ?? null, notes: (ours.notes as string | null) ?? null } : null,
  };
}
