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

/** Un equipo de la federación con su ficha de la temporada; null si no existe. */
export async function getTeamContext(teamId: number, today: string = todayInCanarias()): Promise<TeamContext | null> {
  const { data: row, error } = await supabaseAdmin.from("fed_teams").select("id, tournament_id").eq("id", teamId).maybeSingle();
  if (error) throw new Error(`fed_teams: ${error.message}`);
  if (!row) return null;

  const [tournament, anyMatch] = await Promise.all([
    supabaseAdmin.from("fed_tournaments").select("season").eq("id", row.tournament_id).maybeSingle(),
    supabaseAdmin.from("fed_matches").select("group_id").or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`).limit(1).maybeSingle(),
  ]);
  const season = tournament.data?.season as string | undefined;
  if (!season || !anyMatch.data) return null;
  const grp = await supabaseAdmin.from("fed_groups").select("gender").eq("id", anyMatch.data.group_id).maybeSingle();
  const gender = grp.data?.gender as Gender | undefined;
  if (gender !== "male" && gender !== "female") return null;

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
