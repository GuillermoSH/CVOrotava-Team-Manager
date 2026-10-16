import type { StandingsRow } from "@/lib/fed/standings";
import { ELO_DEFAULT, winProbability, type EloConfig, type EloRun } from "./elo";
import { pickMainGroup } from "./mainGroup";
import { MIN_MATCHES_FOR_RATING } from "./card";
import { isPlayed, viewFor, type SeasonData } from "./types";

/** «nuevo»: el club no estaba en la liga el año pasado. «sin-datos»: estaba, pero sin referencia comparable. */
export type RivalTag = "a-batir" | "cuenta-pendiente" | "bestia" | "asequible" | "nuevo" | "sin-datos";

export type Meeting = {
  season: string;
  date: string;
  home: boolean;
  ownSets: number;
  rivalSets: number;
  won: boolean;
  /** Puntos de cada set desde nuestro lado. */
  sets: { own: number; rival: number }[];
  /** «liga» = grupo principal; «otra» = fase previa, Supercopa, fase final… */
  competition: "liga" | "otra";
};

export type RivalEntry = {
  teamId: number;
  clubId: number | null;
  name: string;
  position: number | null;
  leaguePoints: number;
  played: number;
  /** Rating Elo; null = «limpio» (equipo sin referencia y con pocos partidos). */
  rating: number | null;
  /** Probabilidad calibrada de que ganemos (terreno neutral); null si algún rating falta. */
  winProbability: number | null;
  /** 1 (muy asequible) a 5 (muy difícil). */
  stars: 1 | 2 | 3 | 4 | 5 | null;
  nextMatch: { date: string; home: boolean; probability: number | null } | null;
  /** Enfrentamientos de esta temporada y la anterior, el más reciente primero. */
  meetings: Meeting[];
  record: { current: { w: number; l: number }; previous: { w: number; l: number } };
  tags: RivalTag[];
  reason: string;
  priority: number;
  /** No estaba en la liga la temporada anterior (según el ID de club). */
  isNew: boolean;
};

export type RivalsInput = {
  current: SeasonData;
  previous: SeasonData | null;
  groupId: number;
  today: string;
  standings: StandingsRow[];
  elo: EloRun;
  hasPrior: Set<number>;
  keyOf: (teamId: number) => string;
  prevKeyOf: ((teamId: number) => string) | null;
  cfg?: EloConfig;
};

export function starsFor(p: number): 1 | 2 | 3 | 4 | 5 {
  if (p >= 0.8) return 1;
  if (p >= 0.65) return 2;
  if (p >= 0.45) return 3;
  if (p >= 0.3) return 4;
  return 5;
}

const dayMonth = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

function meetingsBetween(
  data: SeasonData,
  ours: Set<number>,
  rivals: Set<number>,
  mainGroupId: number | null
): Meeting[] {
  const out: Meeting[] = [];
  for (const m of data.matches) {
    if (!isPlayed(m)) continue;
    const ourSide = ours.has(m.homeId) && rivals.has(m.awayId) ? m.homeId : ours.has(m.awayId) && rivals.has(m.homeId) ? m.awayId : null;
    if (ourSide === null) continue;
    const v = viewFor(m, ourSide)!;
    out.push({
      season: data.season,
      date: m.date,
      home: v.home,
      ownSets: v.ownSets,
      rivalSets: v.rivalSets,
      won: v.won,
      sets: v.sets,
      competition: m.groupId === mainGroupId ? "liga" : "otra",
    });
  }
  return out;
}

function reasonFor(args: {
  last: Meeting | undefined;
  currentSeason: string;
  rivalRow: StandingsRow | undefined;
  ourRow: StandingsRow | undefined;
  isNew: boolean;
}): string {
  const parts: string[] = [];
  const { last, rivalRow, ourRow } = args;

  if (last) {
    const score = last.won ? `${last.ownSets}-${last.rivalSets}` : `${last.rivalSets}-${last.ownSets}`;
    const when = last.season === args.currentSeason ? `el ${dayMonth(last.date)}` : "la temporada pasada";
    parts.push(`${last.won ? "Le ganamos" : "Nos ganó"} ${score} ${when}`);
  }

  if (rivalRow && ourRow && rivalRow.played > 0 && ourRow.played > 0) {
    const diff = rivalRow.league_points - ourRow.league_points;
    if (rivalRow.position === 1) parts.push("Líder de la liga");
    else if (diff > 0) parts.push(`${diff} punto${diff === 1 ? "" : "s"} por encima`);
    else if (diff < 0) parts.push(`${-diff} punto${diff === -1 ? "" : "s"} por debajo`);
    else parts.push("Empatado a puntos");
  }

  if (parts.length === 0) parts.push(args.isNew ? "Rival nuevo en la liga" : "Sin cruces recientes");
  return parts.slice(0, 2).join(" · ");
}

export function buildRivals(input: RivalsInput): RivalEntry[] {
  const { current, previous, groupId, today, standings, elo, hasPrior, keyOf, prevKeyOf } = input;
  const cfg = input.cfg ?? ELO_DEFAULT;

  const oursNow = new Set(current.teams.filter((t) => t.isOurs).map((t) => t.id));
  const oursPrev = new Set((previous?.teams ?? []).filter((t) => t.isOurs).map((t) => t.id));
  const prevMainGroup = previous ? pickMainGroup(previous)?.id ?? null : null;
  const groupMatches = current.matches.filter((m) => m.groupId === groupId);
  const rowOf = new Map(standings.map((r) => [r.team_id, r]));

  const ourId = [...oursNow].find((id) => groupMatches.some((m) => m.homeId === id || m.awayId === id)) ?? null;
  if (ourId === null) return [];
  const ourRow = rowOf.get(ourId);

  const isRated = (id: number) => (elo.played.get(id) ?? 0) >= MIN_MATCHES_FOR_RATING || hasPrior.has(id);
  const ourRated = isRated(ourId);
  const ourRating = elo.final.get(ourId) ?? cfg.base;

  const prevTeamsByKey = new Map<string, number[]>();
  if (previous && prevKeyOf) {
    for (const t of previous.teams) {
      if (t.isOurs) continue;
      const k = prevKeyOf(t.id);
      prevTeamsByKey.set(k, [...(prevTeamsByKey.get(k) ?? []), t.id]);
    }
  }

  const rivalIds = [...new Set(groupMatches.flatMap((m) => [m.homeId, m.awayId]))].filter((id) => !oursNow.has(id));
  const entries: RivalEntry[] = [];

  for (const id of rivalIds) {
    const team = current.teams.find((t) => t.id === id);
    if (!team) continue;
    const key = keyOf(id);
    const prevIds = new Set(prevTeamsByKey.get(key) ?? []);
    const isNew = prevIds.size === 0;

    const meetings = [
      ...meetingsBetween(current, oursNow, new Set([id]), groupId),
      ...(previous ? meetingsBetween(previous, oursPrev, prevIds, prevMainGroup) : []),
    ].sort((a, b) => b.date.localeCompare(a.date));

    const rated = isRated(id);
    const rating = rated ? elo.final.get(id) ?? null : null;
    const p = ourRated && rated ? winProbability(ourRating, elo.final.get(id) ?? cfg.base, null, cfg) : null;

    const upcoming = current.matches
      .filter((m) => !isPlayed(m) && !m.finished && m.date >= today && ((oursNow.has(m.homeId) && m.awayId === id) || (oursNow.has(m.awayId) && m.homeId === id)))
      .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)[0];
    const next = upcoming
      ? {
          date: upcoming.date,
          home: oursNow.has(upcoming.homeId),
          probability:
            ourRated && rated
              ? winProbability(ourRating, elo.final.get(id) ?? cfg.base, oursNow.has(upcoming.homeId), cfg)
              : null,
        }
      : null;

    const rivalRow = rowOf.get(id);
    const last = meetings[0];
    const posDiff = rivalRow && ourRow ? rivalRow.position - ourRow.position : null;
    const comparable = Boolean(rivalRow && ourRow && rivalRow.played > 0 && ourRow.played > 0 && posDiff !== null);

    const direct = !comparable ? 0 : Math.abs(posDiff!) <= 2 ? 1 : Math.abs(posDiff!) <= 4 ? 0.5 : 0;
    const debt = last && !last.won ? (last.season === current.season ? 1 : 0.6) : 0;
    const days = next ? daysBetween(today, next.date) : null;
    const soon = days === null ? 0 : days <= 7 ? 1 : days <= 21 ? 0.7 : 0.4;
    const threat = p === null ? 0.3 : 1 - p;
    const priority = Math.round(40 * direct + 25 * debt + 20 * soon + 15 * threat);

    const tags: RivalTag[] = [];
    if (last && !last.won) tags.push("cuenta-pendiente");
    if (comparable && direct >= 0.5 && posDiff! <= 2) tags.push("a-batir");
    if (p !== null && p < 0.3) tags.push("bestia");
    if (p !== null && p >= 0.7) tags.push("asequible");
    if (rating === null && meetings.length === 0) tags.push(isNew ? "nuevo" : "sin-datos");

    const tally = (season: string) => ({
      w: meetings.filter((m) => m.season === season && m.won).length,
      l: meetings.filter((m) => m.season === season && !m.won).length,
    });

    entries.push({
      teamId: id,
      clubId: team.clubId,
      name: team.name,
      position: rivalRow && rivalRow.played > 0 ? rivalRow.position : null,
      leaguePoints: rivalRow?.league_points ?? 0,
      played: rivalRow?.played ?? 0,
      rating: rating === null ? null : Math.round(rating),
      winProbability: p,
      stars: p === null ? null : starsFor(p),
      nextMatch: next,
      meetings,
      record: { current: tally(current.season), previous: previous ? tally(previous.season) : { w: 0, l: 0 } },
      tags,
      reason: reasonFor({ last, currentSeason: current.season, rivalRow, ourRow, isNew }),
      priority,
      isNew,
    });
  }

  return entries.sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name));
}

