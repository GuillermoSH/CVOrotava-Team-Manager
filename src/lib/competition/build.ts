import { computeStandings, type StandingsRow } from "@/lib/fed/standings";

/**
 * Competición de una temporada y género: grupos → jornadas → partidos de TODOS los
 * equipos, no solo los nuestros. Puro (sin Supabase ni fecha del sistema) para poder
 * testearlo. Nada asume un formato: el número de grupos, de jornadas y el tipo de cada
 * grupo salen de los datos, así que vale para liga a un grupo, a dos o con fases finales.
 */

export type Gender = "male" | "female";

export type CompetitionInput = {
  season: string;
  gender: Gender;
  groups: { id: number; name: string; type: string | null; sort_order: number | null }[];
  rounds: { id: number; group_id: number; name: string; sort_order: number | null }[];
  teams: { id: number; name: string; club_id: number | null; is_our_club: boolean }[];
  matches: {
    id: number;
    group_id: number;
    round_id: number | null;
    home_team_id: number | null;
    away_team_id: number | null;
    facility_name: string | null;
    local_date: string | null;
    local_time: string | null;
    finished: boolean;
    canceled: boolean;
    postponed: boolean;
    rest: boolean;
    home_sets: number | null;
    away_sets: number | null;
    home_league_points: number | null;
    away_league_points: number | null;
    report_url: string | null;
    sets: { set_number: number; home_points: number; away_points: number }[];
  }[];
};

export type MatchStatus = "played" | "scheduled" | "postponed" | "canceled" | "rest";

export type CompetitionTeam = { id: number; name: string; clubId: number | null; isOurs: boolean };

export type CompetitionMatch = {
  id: number;
  /** Null en un descanso (el equipo que descansa va en el otro lado). */
  homeId: number | null;
  awayId: number | null;
  /** YYYY-MM-DD, hora local de Canarias; null si aún no hay fecha. */
  date: string | null;
  /** HH:MM */
  time: string | null;
  venue: string | null;
  status: MatchStatus;
  homeSets: number | null;
  awaySets: number | null;
  /** Puntos de cada set, en orden. Vacío si el acta no los trae. */
  sets: { home: number; away: number }[];
  reportUrl: string | null;
  /** Juega alguno de nuestros equipos. */
  ours: boolean;
};

export type CompetitionRound = {
  id: number | null;
  /** Posición dentro del grupo (1, 2, 3…); 0 para los partidos sin jornada. */
  index: number;
  label: string;
  startDate: string | null;
  endDate: string | null;
  matches: CompetitionMatch[];
};

export type CompetitionStanding = StandingsRow & { teamId: number };

export type CompetitionGroup = {
  id: number;
  name: string;
  type: string | null;
  teamIds: number[];
  rounds: CompetitionRound[];
  /** Solo en grupos de liga: en eliminatorias la tabla no tiene sentido. */
  standings: CompetitionStanding[] | null;
  /** Índice (en `rounds`) de la jornada que se enseña por defecto. */
  currentRound: number;
  /** Juega algún equipo nuestro. */
  hasOurs: boolean;
};

export type Competition = {
  season: string;
  gender: Gender;
  groups: CompetitionGroup[];
  teams: Record<number, CompetitionTeam>;
};

export function matchStatus(m: CompetitionInput["matches"][number]): MatchStatus {
  if (m.canceled) return "canceled";
  if (m.rest) return "rest";
  if (m.finished && m.home_sets !== null && m.away_sets !== null) return "played";
  if (m.postponed) return "postponed";
  return "scheduled";
}

const hhmm = (t: string | null): string | null => (t ? t.slice(0, 5) : null);

/** Jornada que se abre por defecto: la próxima con partidos por jugar; si no, la última jugada. */
export function pickCurrentRound(rounds: CompetitionRound[], today: string): number {
  const upcoming = rounds.findIndex((r) =>
    r.matches.some((m) => m.status === "scheduled" && m.date !== null && m.date >= today)
  );
  if (upcoming !== -1) return upcoming;
  for (let i = rounds.length - 1; i >= 0; i--) {
    if (rounds[i].matches.some((m) => m.status === "played")) return i;
  }
  return 0;
}

export function buildCompetition(input: CompetitionInput, today: string): Competition {
  const teams: Record<number, CompetitionTeam> = {};
  for (const t of input.teams) {
    teams[t.id] = { id: t.id, name: t.name, clubId: t.club_id, isOurs: t.is_our_club };
  }
  const isOurs = (id: number | null) => id !== null && teams[id]?.isOurs === true;

  const groups: CompetitionGroup[] = [...input.groups]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id)
    .map((g) => {
      const matches = input.matches.filter((m) => m.group_id === g.id);

      const roundDefs = input.rounds
        .filter((r) => r.group_id === g.id)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id);

      const toMatch = (m: CompetitionInput["matches"][number]): CompetitionMatch => ({
        id: m.id,
        homeId: m.home_team_id,
        awayId: m.away_team_id,
        date: m.local_date,
        time: hhmm(m.local_time),
        venue: m.facility_name,
        status: matchStatus(m),
        homeSets: m.home_sets,
        awaySets: m.away_sets,
        sets: [...m.sets]
          .sort((a, b) => a.set_number - b.set_number)
          .map((s) => ({ home: s.home_points, away: s.away_points })),
        reportUrl: m.report_url,
        ours: isOurs(m.home_team_id) || isOurs(m.away_team_id),
      });

      const byTimeThenId = (a: CompetitionMatch, b: CompetitionMatch) =>
        (a.date ?? "9999").localeCompare(b.date ?? "9999") ||
        (a.time ?? "").localeCompare(b.time ?? "") ||
        a.id - b.id;

      const makeRound = (id: number | null, index: number, label: string, ms: typeof matches): CompetitionRound => {
        const list = ms.map(toMatch).sort(byTimeThenId);
        const dates = list.map((m) => m.date).filter((d): d is string => d !== null);
        return {
          id,
          index,
          label,
          startDate: dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : null,
          endDate: dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null,
          matches: list,
        };
      };

      const rounds = roundDefs.map((r, i) =>
        makeRound(r.id, i + 1, r.name, matches.filter((m) => m.round_id === r.id))
      );
      const known = new Set(roundDefs.map((r) => r.id));
      const loose = matches.filter((m) => m.round_id === null || !known.has(m.round_id));
      if (loose.length > 0) rounds.push(makeRound(null, 0, "Sin jornada", loose));

      const teamIds = [
        ...new Set(matches.flatMap((m) => [m.home_team_id, m.away_team_id]).filter((id): id is number => id !== null)),
      ];

      const standings =
        g.type === "league"
          ? computeStandings(
              teamIds,
              matches
                .filter((m) => !m.canceled && !m.rest)
                .map((m) => ({
                  home_team_id: m.home_team_id,
                  away_team_id: m.away_team_id,
                  finished: m.finished,
                  home_sets: m.home_sets,
                  away_sets: m.away_sets,
                  home_league_points: m.home_league_points,
                  away_league_points: m.away_league_points,
                  home_points: m.sets.length ? m.sets.reduce((a, s) => a + s.home_points, 0) : null,
                  away_points: m.sets.length ? m.sets.reduce((a, s) => a + s.away_points, 0) : null,
                }))
            ).map((r) => ({ ...r, teamId: r.team_id }))
          : null;

      return {
        id: g.id,
        name: g.name,
        type: g.type,
        teamIds,
        rounds,
        standings,
        currentRound: pickCurrentRound(rounds, today),
        hasOurs: teamIds.some((id) => isOurs(id)),
      };
    });

  return { season: input.season, gender: input.gender, groups, teams };
}

/** La federación nombra las jornadas con solo el número («2»): se enseña como «Jornada 2». */
export function roundTitle(label: string): string {
  const text = label.trim();
  return /^\d+$/.test(text) ? `Jornada ${text}` : text;
}

const LOWER_WORDS = new Set(["de", "del"]);

/** «GRUPO LAS PALMAS» → «Grupo Las Palmas» (la federación escribe los grupos en mayúsculas). */
export function groupLabel(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es")
    .split(" ")
    .map((w, i) => (i > 0 && LOWER_WORDS.has(w) ? w : w.charAt(0).toLocaleUpperCase("es") + w.slice(1)))
    .join(" ");
}
