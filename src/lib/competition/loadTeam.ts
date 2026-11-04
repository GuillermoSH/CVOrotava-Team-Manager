import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { todayInCanarias } from "@/lib/stats/competitive/seasons";
import { getCompetition } from "./load";
import { getMatchReports } from "./loadReport";
import { buildTeamProfile, type TeamProfile } from "./teamProfile";
import type { CompetitionGroup, CompetitionMatch, CompetitionStanding, CompetitionTeam, Gender } from "./build";

export type TeamContext = {
  season: string;
  gender: Gender;
  team: CompetitionTeam;
  /** Grupos en los que juega, con su puesto en la clasificación si el grupo es de liga. */
  groups: { id: number; name: string; standing: (CompetitionStanding & { position: number }) | null }[];
  /** Todos sus partidos de la temporada, por orden de fecha. */
  matches: (CompetitionMatch & { groupId: number; roundLabel: string })[];
  teams: Record<number, CompetitionTeam>;
  profile: TeamProfile;
};

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

/** Temporada y género de un equipo, en dos consultas en paralelo (cacheadas: solo cambian al sincronizar). */
const lookupTeamWhere = unstable_cache(
  async (teamId: number): Promise<{ season: string; gender: Gender } | null> => {
    const [team, anyMatch] = await Promise.all([
      supabaseAdmin.from("fed_teams").select("fed_tournaments(season)").eq("id", teamId).maybeSingle(),
      supabaseAdmin
        .from("fed_matches")
        .select("fed_groups(gender)")
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
        .limit(1)
        .maybeSingle(),
    ]);
    if (team.error) throw new Error(`fed_teams: ${team.error.message}`);
    if (anyMatch.error) throw new Error(`fed_matches: ${anyMatch.error.message}`);
    const season = one(team.data?.fed_tournaments as { season: string } | { season: string }[] | null)?.season;
    const gender = one(anyMatch.data?.fed_groups as { gender: string } | { gender: string }[] | null)?.gender;
    if (!season || (gender !== "male" && gender !== "female")) return null;
    return { season, gender };
  },
  ["fed-team-where"],
  { revalidate: 3600, tags: ["fed"] }
);

/** Un equipo de la federación con su ficha de la temporada; null si no existe. */
export async function getTeamContext(teamId: number, today: string = todayInCanarias()): Promise<TeamContext | null> {
  const where = await lookupTeamWhere(teamId);
  if (!where) return null;
  const { season, gender } = where;

  const competition = await getCompetition(season, gender, today);
  const team = competition?.teams[teamId];
  if (!competition || !team) return null;

  const mine = (g: CompetitionGroup) => g.teamIds.includes(teamId) || g.rounds.some((r) => r.matches.some((m) => m.homeId === teamId || m.awayId === teamId));
  const groups = competition.groups.filter(mine);
  const matches = groups
    .flatMap((g) => g.rounds.flatMap((r) => r.matches.filter((m) => m.homeId === teamId || m.awayId === teamId).map((m) => ({ ...m, groupId: g.id, roundLabel: r.label }))))
    .sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999") || a.id - b.id);

  const reports = await getMatchReports(matches.filter((m) => m.status === "played").map((m) => m.id));
  const profile = buildTeamProfile(
    teamId,
    matches.map((match) => ({ match, report: reports.get(match.id) ?? null }))
  );

  return {
    season,
    gender,
    team,
    groups: groups.map((g) => {
      const i = g.standings?.findIndex((s) => s.teamId === teamId) ?? -1;
      return { id: g.id, name: g.name, standing: g.standings && i >= 0 ? { ...g.standings[i], position: i + 1 } : null };
    }),
    matches,
    teams: competition.teams,
    profile,
  };
}
