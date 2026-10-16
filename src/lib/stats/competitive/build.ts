import { normalizeTeamName } from "@/lib/standings/normalize";
import { ELO_DEFAULT, runElo, seedRatings, winProbability, type EloConfig } from "./elo";
import { buildAchievements, bestWinStreak, ourViewsOf, type Achievement } from "./achievements";
import { buildCard, MIN_MATCHES_FOR_RATING, type TeamCard } from "./card";
import { samePointLastYear, seasonRecords, type RecordRow, type SamePoint } from "./compare";
import { computeMetrics, type TeamMetrics } from "./metrics";
import { pickMainGroup, pickOurTeamId } from "./mainGroup";
import { buildRivals, starsFor, type RivalEntry } from "./rivals";
import { positionsByRound, standingsOf, teamIdsOf } from "./standings";
import { isPlayed, rivalKey, type Gender, type SeasonData } from "./types";

export type StandingsLine = {
  position: number;
  teamId: number;
  name: string;
  isOurs: boolean;
  played: number;
  wins: number;
  losses: number;
  leaguePoints: number;
  setsFor: number;
  setsAgainst: number;
  /** Rating Elo; null = «limpio». */
  rating: number | null;
};

export type CompetitiveStats = {
  season: string;
  gender: Gender;
  asOf: string;
  /** false si todavía no hay ninguna liga con nuestro equipo en esta temporada. */
  hasLeague: boolean;
  group: { id: number; name: string; teams: number } | null;
  ourTeam: { id: number; name: string } | null;
  card: TeamCard | null;
  previousCard: TeamCard | null;
  form: {
    last5: ("W" | "L")[];
    streak: { type: "W" | "L"; length: number } | null;
    bestWinStreak: number;
  };
  nextMatch: {
    date: string;
    home: boolean;
    rivalId: number | null;
    rivalName: string;
    winProbability: number | null;
    stars: 1 | 2 | 3 | 4 | 5 | null;
  } | null;
  rivals: RivalEntry[];
  standings: StandingsLine[];
  positionsByRound: ReturnType<typeof positionsByRound>;
  versus: SamePoint | null;
  records: RecordRow[];
  achievements: Achievement[];
  hasPrevious: boolean;
  /** IDs de la federación de nuestros partidos jugados en la liga regular (para filtrar el resumen). */
  leagueMatchIds: number[];
};

const EMPTY_FORM: CompetitiveStats["form"] = { last5: [], streak: null, bestWinStreak: 0 };

export function buildCompetitiveStats(input: {
  current: SeasonData;
  previous: SeasonData | null;
  /** YYYY-MM-DD en hora de Canarias. */
  today: string;
  cfg?: EloConfig;
}): CompetitiveStats {
  const { current, previous, today } = input;
  const cfg = input.cfg ?? ELO_DEFAULT;

  const base: CompetitiveStats = {
    season: current.season,
    gender: current.gender,
    asOf: today,
    hasLeague: false,
    group: null,
    ourTeam: null,
    card: null,
    previousCard: null,
    form: EMPTY_FORM,
    nextMatch: null,
    rivals: [],
    standings: [],
    positionsByRound: [],
    versus: null,
    records: [],
    achievements: [],
    hasPrevious: previous !== null,
    leagueMatchIds: [],
  };

  const group = pickMainGroup(current);
  const ourId = group ? pickOurTeamId(current, group.id) : null;
  if (!group || ourId === null) return base;

  const teamById = new Map(current.teams.map((t) => [t.id, t]));
  const keyOf = (id: number) => {
    const t = teamById.get(id);
    return !t ? `x${id}` : t.isOurs ? "ours" : rivalKey(t, normalizeTeamName);
  };

  // ── Temporada anterior: rating final desde cero + ficha ──────────────
  const prevGroup = previous ? pickMainGroup(previous) : null;
  const prevOurId = previous && prevGroup ? pickOurTeamId(previous, prevGroup.id) : null;
  const prevMatches = previous && prevGroup ? previous.matches.filter((m) => m.groupId === prevGroup.id) : [];
  const prevTeamById = new Map((previous?.teams ?? []).map((t) => [t.id, t]));
  const prevKeyOf = (id: number) => {
    const t = prevTeamById.get(id);
    return !t ? `x${id}` : t.isOurs ? "ours" : rivalKey(t, normalizeTeamName);
  };
  const prevIds = teamIdsOf(prevMatches);
  const prevElo = runElo(prevMatches, new Map(prevIds.map((id) => [id, cfg.base])), cfg);
  const prevFinal = prevMatches.length
    ? new Map([...prevElo.final].map(([id, r]) => [prevKeyOf(id), r]))
    : null;

  const prevStandings = standingsOf(prevIds, prevMatches);
  const prevMetrics = new Map<number, TeamMetrics>(prevIds.map((id) => [id, computeMetrics(id, prevMatches)]));
  const previousCard =
    previous && prevOurId !== null
      ? buildCard({
          season: previous.season,
          teamId: prevOurId,
          teamName: prevTeamById.get(prevOurId)?.name ?? "",
          standings: prevStandings,
          metrics: prevMetrics,
          elo: prevElo,
          hasPrior: false,
        })
      : null;

  // ── Temporada actual ─────────────────────────────────────────────────
  const groupMatches = current.matches.filter((m) => m.groupId === group.id);
  const ids = teamIdsOf(groupMatches);
  const { seeds, hasPrior } = seedRatings(ids, keyOf, prevFinal, cfg);
  const elo = runElo(groupMatches, seeds, cfg);
  const standings = standingsOf(ids, groupMatches);
  const metrics = new Map<number, TeamMetrics>(ids.map((id) => [id, computeMetrics(id, groupMatches)]));

  const card = buildCard({
    season: current.season,
    teamId: ourId,
    teamName: teamById.get(ourId)?.name ?? "",
    standings,
    metrics,
    elo,
    hasPrior: hasPrior.has(ourId),
  });

  const ourIdsNow = new Set(current.teams.filter((t) => t.isOurs).map((t) => t.id));
  const ourIdsPrev = new Set((previous?.teams ?? []).filter((t) => t.isOurs).map((t) => t.id));
  const views = ourViewsOf(current.matches, ourIdsNow);
  const prevViews = previous ? ourViewsOf(previous.matches, ourIdsPrev) : null;

  // Forma
  const results = views.map((v) => (v.won ? ("W" as const) : ("L" as const)));
  let streak: CompetitiveStats["form"]["streak"] = null;
  if (results.length) {
    const type = results[results.length - 1];
    let length = 0;
    for (let i = results.length - 1; i >= 0 && results[i] === type; i--) length++;
    streak = { type, length };
  }

  // Rivales y próximo partido
  const rivals = buildRivals({
    current,
    previous,
    groupId: group.id,
    today,
    standings,
    elo,
    hasPrior,
    keyOf,
    prevKeyOf: previous ? prevKeyOf : null,
    cfg,
  });

  const upcoming = current.matches
    .filter((m) => !isPlayed(m) && !m.finished && m.date >= today && (ourIdsNow.has(m.homeId) || ourIdsNow.has(m.awayId)))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)[0];
  let nextMatch: CompetitiveStats["nextMatch"] = null;
  if (upcoming) {
    const home = ourIdsNow.has(upcoming.homeId);
    const rivalId = home ? upcoming.awayId : upcoming.homeId;
    const ratedNow = (id: number) => (elo.played.get(id) ?? 0) >= MIN_MATCHES_FOR_RATING || hasPrior.has(id);
    const p =
      upcoming.groupId === group.id && ratedNow(ourId) && ratedNow(rivalId)
        ? winProbability(elo.final.get(ourId) ?? cfg.base, elo.final.get(rivalId) ?? cfg.base, home, cfg)
        : null;
    nextMatch = {
      date: upcoming.date,
      home,
      rivalId,
      rivalName: teamById.get(rivalId)?.name ?? "Rival",
      winProbability: p,
      stars: p === null ? null : starsFor(p),
    };
  }

  const prevOurRow = prevOurId !== null ? prevStandings.find((r) => r.team_id === prevOurId) : undefined;
  const versus =
    previous && prevViews && prevGroup
      ? samePointLastYear(views, prevViews, group.id, prevGroup.id, previousCard?.position ?? null)
      : null;

  return {
    ...base,
    hasLeague: true,
    group: { id: group.id, name: group.name, teams: ids.length },
    ourTeam: { id: ourId, name: teamById.get(ourId)?.name ?? "" },
    card,
    previousCard,
    leagueMatchIds: views.filter((v) => v.match.groupId === group.id).map((v) => v.match.id),
    form: { last5: results.slice(-5), streak, bestWinStreak: bestWinStreak(views) },
    nextMatch,
    rivals,
    standings: standings.map((r) => {
      const t = teamById.get(r.team_id);
      const rated = (elo.played.get(r.team_id) ?? 0) >= MIN_MATCHES_FOR_RATING || hasPrior.has(r.team_id);
      return {
        position: r.position,
        teamId: r.team_id,
        name: t?.name ?? `Equipo ${r.team_id}`,
        isOurs: Boolean(t?.isOurs),
        played: r.played,
        wins: r.won,
        losses: r.lost,
        leaguePoints: r.league_points,
        setsFor: r.sets_for,
        setsAgainst: r.sets_against,
        rating: rated ? Math.round(elo.final.get(r.team_id) ?? cfg.base) : null,
      };
    }),
    positionsByRound: positionsByRound(groupMatches),
    versus,
    // Récords de liga regular (como «el mismo punto del año pasado»); los logros cuentan todas las competiciones.
    records: seasonRecords(
      views.filter((v) => v.match.groupId === group.id),
      prevViews && prevGroup ? prevViews.filter((v) => v.match.groupId === prevGroup.id) : null
    ),
    achievements: buildAchievements({
      views,
      groupMatches,
      groupId: group.id,
      previousLeaguePoints: prevOurRow ? prevOurRow.league_points : null,
      leaguePointsNow: card.leaguePoints,
    }),
  };
}
