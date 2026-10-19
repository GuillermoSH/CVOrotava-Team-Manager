import { pickMainGroup } from "@/lib/stats/competitive/mainGroup";
import { isPlayed, type CompMatch, type SeasonData } from "@/lib/stats/competitive/types";

export type RoundupMatch = {
  id: number;
  date: string;
  home: string;
  away: string;
  homeSets: number;
  awaySets: number;
  ours: boolean;
};

export type WeekendRoundup = {
  /** «Jornada 5» si se conoce. */
  roundLabel: string | null;
  dateFrom: string;
  dateTo: string;
  ours: RoundupMatch;
  others: RoundupMatch[];
  /** Cuántos de los otros partidos se resolvieron sin que el perdedor ganara ningún set. */
  othersSwept: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const dayNumber = (iso: string) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / DAY_MS);

/**
 * La última jornada de la liga regular en la que hemos jugado: nuestro partido y
 * los demás de esa misma jornada (o, sin jornada conocida, de ±3 días).
 */
export function buildWeekendRoundup(data: SeasonData, today: string): WeekendRoundup | null {
  const group = pickMainGroup(data);
  if (!group) return null;

  const teamName = new Map(data.teams.map((t) => [t.id, t.name]));
  const ourIds = new Set(data.teams.filter((t) => t.isOurs).map((t) => t.id));
  const played = data.matches.filter((m) => m.groupId === group.id && isPlayed(m) && m.date <= today);

  const isOurs = (m: CompMatch) => ourIds.has(m.homeId) || ourIds.has(m.awayId);
  const last = played
    .filter(isOurs)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)[0];
  if (!last) return null;

  const sameRound = (m: CompMatch) =>
    last.roundIndex !== null
      ? m.roundIndex === last.roundIndex
      : Math.abs(dayNumber(m.date) - dayNumber(last.date)) <= 3;

  const toRow = (m: CompMatch): RoundupMatch => ({
    id: m.id,
    date: m.date,
    home: teamName.get(m.homeId) ?? "—",
    away: teamName.get(m.awayId) ?? "—",
    homeSets: m.homeSets!,
    awaySets: m.awaySets!,
    ours: isOurs(m),
  });

  const round = played.filter(sameRound);
  const others = round
    .filter((m) => m.id !== last.id)
    .map(toRow)
    .sort((a, b) => a.date.localeCompare(b.date) || a.home.localeCompare(b.home, "es"));
  const dates = round.map((m) => m.date).sort();

  return {
    roundLabel: last.roundLabel,
    dateFrom: dates[0],
    dateTo: dates[dates.length - 1],
    ours: toRow(last),
    others,
    othersSwept: others.filter((m) => Math.min(m.homeSets, m.awaySets) === 0).length,
  };
}
