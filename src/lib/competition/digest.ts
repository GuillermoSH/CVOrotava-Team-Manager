import { computeStandings, type StandingsMatch } from "@/lib/fed/standings";
import type { CompetitionGroup, CompetitionMatch, CompetitionStanding } from "./build";

/**
 * Resumen de una jornada: la clasificación tras ella con lo que se ha movido cada equipo y
 * lo más destacado de los resultados. Puro, a partir de los partidos jugados del grupo.
 */

export type StandingRow = CompetitionStanding & {
  /** Puestos que ha subido (+) o bajado (−) con esta jornada; null si no hay con qué comparar. */
  movement: number | null;
};

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function toStandingsMatch(m: CompetitionMatch): StandingsMatch {
  return {
    home_team_id: m.homeId,
    away_team_id: m.awayId,
    finished: m.status === "played",
    home_sets: m.homeSets,
    away_sets: m.awaySets,
    home_league_points: null,
    away_league_points: null,
    home_points: m.sets.length ? sum(m.sets.map((s) => s.home)) : null,
    away_points: m.sets.length ? sum(m.sets.map((s) => s.away)) : null,
  };
}

/** Clasificación con los partidos jugados hasta la jornada `upTo` (posición en `group.rounds`, inclusive). */
function tableAfter(group: CompetitionGroup, upTo: number): CompetitionStanding[] {
  const played = group.rounds
    .slice(0, upTo + 1)
    .flatMap((r) => r.matches)
    .filter((m) => m.status === "played")
    .map(toStandingsMatch);
  return computeStandings(group.teamIds, played).map((r) => ({ ...r, teamId: r.team_id }));
}

/** Clasificación tras la jornada `roundIdx`, con el movimiento de cada equipo respecto a la anterior. */
export function standingsAfterRound(group: CompetitionGroup, roundIdx: number): StandingRow[] {
  const now = tableAfter(group, roundIdx);
  const before = roundIdx > 0 ? tableAfter(group, roundIdx - 1) : null;
  const prev = new Map((before ?? []).map((r) => [r.teamId, r]));
  return now.map((r) => {
    const p = prev.get(r.teamId);
    const comparable = p !== undefined && p.played > 0 && r.played > 0;
    return { ...r, movement: comparable ? p.position - r.position : null };
  });
}

/** Puesto de cada equipo tras cada jornada con partidos jugados (la «carrera» de posiciones). */
export function positionsByRound(group: CompetitionGroup): { round: number; positions: Record<number, number> }[] {
  if (group.standings === null) return [];
  const out: { round: number; positions: Record<number, number> }[] = [];
  group.rounds.forEach((r, i) => {
    if (r.index === 0 || !r.matches.some((m) => m.status === "played")) return;
    out.push({
      round: r.index,
      positions: Object.fromEntries(tableAfter(group, i).map((s) => [s.teamId, s.position])),
    });
  });
  return out;
}

// ─── Lo destacado ─────────────────────────────────────────────

export type Highlight =
  | { kind: "leader"; teamId: number; points: number; change: "first" | "same" | "new" }
  | { kind: "walkover"; winnerId: number; loserId: number }
  | { kind: "upset"; winnerId: number; loserId: number; winnerPos: number; loserPos: number; score: string }
  | { kind: "biggest"; winnerId: number; loserId: number; score: string; pointDiff: number }
  | { kind: "closest"; winnerId: number; loserId: number; score: string; pointDiff: number | null }
  | { kind: "climber"; teamId: number; places: number }
  | { kind: "faller"; teamId: number; places: number };

/** Diferencia de puntos mínima para llamar «contundente» a una victoria por 3-0. */
export const BIGGEST_MIN_DIFF = 15;
/** Puestos de diferencia entre el ganador y el perdedor para hablar de sorpresa. */
export const UPSET_MIN_GAP = 3;
const MOVEMENT_MIN = 2;

function resultOf(m: CompetitionMatch) {
  const homeWon = (m.homeSets ?? 0) > (m.awaySets ?? 0);
  const winnerId = (homeWon ? m.homeId : m.awayId) as number;
  const loserId = (homeWon ? m.awayId : m.homeId) as number;
  const hi = Math.max(m.homeSets ?? 0, m.awaySets ?? 0);
  const lo = Math.min(m.homeSets ?? 0, m.awaySets ?? 0);
  const pointDiff = m.sets.length
    ? Math.abs(sum(m.sets.map((s) => s.home)) - sum(m.sets.map((s) => s.away)))
    : null;
  // Un 3-0 con el perdedor a cero en todos los sets es una incomparecencia, no un resultado deportivo.
  const loserPoints = m.sets.length ? sum(m.sets.map((s) => (homeWon ? s.away : s.home))) : null;
  const walkover = loserPoints === 0;
  return { winnerId, loserId, hi, lo, score: `${hi}-${lo}`, pointDiff, walkover };
}

/** Lo más destacado de una jornada, de lo más a lo menos relevante (como mucho cinco). */
export function roundDigest(group: CompetitionGroup, roundIdx: number): Highlight[] {
  const round = group.rounds[roundIdx];
  if (!round || group.standings === null) return [];
  const played = round.matches.filter((m) => m.status === "played" && m.homeId !== null && m.awayId !== null);
  if (played.length === 0) return [];

  const rows = standingsAfterRound(group, roundIdx);
  const before = roundIdx > 0 ? tableAfter(group, roundIdx - 1) : [];
  const beforeHasGames = before.some((r) => r.played > 0);
  const posBefore = new Map(before.map((r) => [r.teamId, r]));
  const out: Highlight[] = [];

  const leader = rows[0];
  if (leader && leader.played > 0) {
    const prevLeader = beforeHasGames ? before[0].teamId : null;
    out.push({
      kind: "leader",
      teamId: leader.teamId,
      points: leader.league_points,
      change: prevLeader === null ? "first" : prevLeader === leader.teamId ? "same" : "new",
    });
  }

  for (const m of played) {
    const r = resultOf(m);
    if (r.walkover) out.push({ kind: "walkover", winnerId: r.winnerId, loserId: r.loserId });
  }

  if (beforeHasGames) {
    const upsets = played
      .map((m) => ({ r: resultOf(m) }))
      .filter(({ r }) => !r.walkover)
      .map(({ r }) => {
        const w = posBefore.get(r.winnerId);
        const l = posBefore.get(r.loserId);
        return w && l && w.played > 0 && l.played > 0 ? { r, gap: w.position - l.position, w: w.position, l: l.position } : null;
      })
      .filter((x): x is { r: ReturnType<typeof resultOf>; gap: number; w: number; l: number } => x !== null && x.gap >= UPSET_MIN_GAP)
      .sort((a, b) => b.gap - a.gap);
    if (upsets[0]) {
      const u = upsets[0];
      out.push({ kind: "upset", winnerId: u.r.winnerId, loserId: u.r.loserId, winnerPos: u.w, loserPos: u.l, score: u.r.score });
    }
  }

  const sweeps = played
    .map(resultOf)
    .filter((r) => !r.walkover && r.hi === 3 && r.lo === 0 && r.pointDiff !== null && r.pointDiff >= BIGGEST_MIN_DIFF)
    .sort((a, b) => (b.pointDiff as number) - (a.pointDiff as number));
  if (sweeps[0]) {
    out.push({ kind: "biggest", winnerId: sweeps[0].winnerId, loserId: sweeps[0].loserId, score: sweeps[0].score, pointDiff: sweeps[0].pointDiff as number });
  }

  const fiveSets = played
    .map(resultOf)
    .filter((r) => !r.walkover && r.hi === 3 && r.lo === 2)
    .sort((a, b) => (a.pointDiff ?? Infinity) - (b.pointDiff ?? Infinity));
  if (fiveSets[0]) {
    out.push({ kind: "closest", winnerId: fiveSets[0].winnerId, loserId: fiveSets[0].loserId, score: fiveSets[0].score, pointDiff: fiveSets[0].pointDiff });
  }

  const moved = rows.filter((r) => r.movement !== null);
  const up = [...moved].sort((a, b) => (b.movement as number) - (a.movement as number))[0];
  if (up && (up.movement as number) >= MOVEMENT_MIN) out.push({ kind: "climber", teamId: up.teamId, places: up.movement as number });
  const down = [...moved].sort((a, b) => (a.movement as number) - (b.movement as number))[0];
  if (down && (down.movement as number) <= -MOVEMENT_MIN) out.push({ kind: "faller", teamId: down.teamId, places: -(down.movement as number) });

  return out.slice(0, 5);
}

const places = (n: number) => `${n} ${n === 1 ? "puesto" : "puestos"}`;

/** Frase en castellano de un hecho destacado; `name` da el nombre de cada equipo. */
export function describeHighlight(h: Highlight, name: (teamId: number) => string): string {
  switch (h.kind) {
    case "leader":
      if (h.change === "new") return `${name(h.teamId)} es el nuevo líder, con ${h.points} puntos.`;
      if (h.change === "same") return `${name(h.teamId)} sigue líder, con ${h.points} puntos.`;
      return `${name(h.teamId)} lidera la clasificación, con ${h.points} puntos.`;
    case "walkover":
      return `${name(h.winnerId)} gana 3-0 sin que ${name(h.loserId)} anote ningún punto (parece una incomparecencia).`;
    case "upset":
      return `Sorpresa: ${name(h.winnerId)} (${h.winnerPos}.º) gana ${h.score} a ${name(h.loserId)} (${h.loserPos}.º).`;
    case "biggest":
      return `Victoria más contundente: ${name(h.winnerId)} gana ${h.score} a ${name(h.loserId)}, con ${h.pointDiff} puntos de diferencia.`;
    case "closest":
      return h.pointDiff === null
        ? `Partido más igualado: ${name(h.winnerId)} gana ${h.score} a ${name(h.loserId)} en cinco sets.`
        : `Partido más igualado: ${name(h.winnerId)} gana ${h.score} a ${name(h.loserId)}, decidido por ${h.pointDiff} ${h.pointDiff === 1 ? "punto" : "puntos"} en total.`;
    case "climber":
      return `${name(h.teamId)} sube ${places(h.places)}.`;
    case "faller":
      return `${name(h.teamId)} baja ${places(h.places)}.`;
  }
}
