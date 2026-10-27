import type { CompetitionMatch } from "./build";

/**
 * Scout de equipos y de enfrentamientos a partir de los partidos jugados de un grupo
 * (de TODOS los equipos, no solo los nuestros). Puro y sin dependencias: lo que no
 * se puede calcular (p. ej. puntos por set cuando el acta no los trae) sale como null.
 */

/** Un partido jugado visto desde un equipo. */
export type Outcome = {
  matchId: number;
  date: string | null;
  home: boolean;
  rivalId: number;
  ownSets: number;
  rivalSets: number;
  won: boolean;
  /** Puntos de cada set desde el punto de vista del equipo; vacío si el acta no los trae. */
  sets: { own: number; rival: number }[];
};

export type Record2 = { played: number; won: number };

export type ScoreBreakdown = {
  /** Victorias por 3-0, 3-1, 3-2 y derrotas por 2-3, 1-3, 0-3. */
  w30: number;
  w31: number;
  w32: number;
  l32: number;
  l31: number;
  l30: number;
};

export type TeamScout = {
  teamId: number;
  played: number;
  won: number;
  lost: number;
  /** Últimos partidos, del más reciente al más antiguo (máx. 5). */
  form: { rivalId: number; won: boolean; score: string; home: boolean }[];
  /** Racha actual (victorias o derrotas seguidas). */
  streak: { won: boolean; length: number } | null;
  home: Record2;
  away: Record2;
  setsFor: number;
  setsAgainst: number;
  /** Totales de puntos y nº de sets con puntos conocidos; null si ningún acta los trae. */
  points: { for: number; against: number; sets: number } | null;
  /** Diferencia media de puntos por set (positiva = domina). */
  pointDiffPerSet: number | null;
  /** Sets decididos por 2 puntos o menos (o que se fueron más allá del 25). */
  closeSets: Record2;
  results: ScoreBreakdown;
  /** Qué pasa según cómo acabe el primer set. */
  firstSet: { wonFirst: Record2; lostFirst: Record2 };
};

const rec = (): Record2 => ({ played: 0, won: 0 });

export const isPlayedMatch = (m: CompetitionMatch): boolean =>
  m.status === "played" && m.homeSets !== null && m.awaySets !== null && m.homeId !== null && m.awayId !== null;

/** Partidos jugados de un equipo, por orden de fecha (los sin fecha, primero). */
export function outcomesOf(matches: CompetitionMatch[], teamId: number): Outcome[] {
  const out: Outcome[] = [];
  for (const m of matches) {
    if (!isPlayedMatch(m)) continue;
    const home = m.homeId === teamId;
    if (!home && m.awayId !== teamId) continue;
    const ownSets = (home ? m.homeSets : m.awaySets) as number;
    const rivalSets = (home ? m.awaySets : m.homeSets) as number;
    out.push({
      matchId: m.id,
      date: m.date,
      home,
      rivalId: (home ? m.awayId : m.homeId) as number,
      ownSets,
      rivalSets,
      won: ownSets > rivalSets,
      sets: m.sets.map((s) => (home ? { own: s.home, rival: s.away } : { own: s.away, rival: s.home })),
    });
  }
  return out.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") || a.matchId - b.matchId);
}

/** ¿Set ajustado? Se decide por 2 puntos o menos (25-23, 26-24, 15-13…). */
export const isCloseSet = (s: { own: number; rival: number }): boolean => Math.abs(s.own - s.rival) <= 2;

function pointTotals(outcomes: Outcome[]): { for: number; against: number; sets: number } | null {
  let pf = 0;
  let pa = 0;
  let n = 0;
  for (const o of outcomes)
    for (const s of o.sets) {
      pf += s.own;
      pa += s.rival;
      n++;
    }
  return n > 0 ? { for: pf, against: pa, sets: n } : null;
}

const diffPerSet = (p: { for: number; against: number; sets: number } | null): number | null =>
  p ? (p.for - p.against) / p.sets : null;

export function scoutTeam(matches: CompetitionMatch[], teamId: number): TeamScout {
  const outcomes = outcomesOf(matches, teamId);
  const scout: TeamScout = {
    teamId,
    played: outcomes.length,
    won: 0,
    lost: 0,
    form: [],
    streak: null,
    home: rec(),
    away: rec(),
    setsFor: 0,
    setsAgainst: 0,
    points: pointTotals(outcomes),
    pointDiffPerSet: null,
    closeSets: rec(),
    results: { w30: 0, w31: 0, w32: 0, l32: 0, l31: 0, l30: 0 },
    firstSet: { wonFirst: rec(), lostFirst: rec() },
  };
  scout.pointDiffPerSet = diffPerSet(scout.points);

  for (const o of outcomes) {
    if (o.won) scout.won++;
    else scout.lost++;
    const side = o.home ? scout.home : scout.away;
    side.played++;
    if (o.won) side.won++;
    scout.setsFor += o.ownSets;
    scout.setsAgainst += o.rivalSets;

    // Solo existen los marcadores de partido a 3 sets ganados (3-0, 3-1, 3-2).
    const key = `${o.won ? "w" : "l"}${Math.max(o.ownSets, o.rivalSets)}${Math.min(o.ownSets, o.rivalSets)}`;
    if (key in scout.results) scout.results[key as keyof ScoreBreakdown]++;

    for (const s of o.sets)
      if (isCloseSet(s)) {
        scout.closeSets.played++;
        if (s.own > s.rival) scout.closeSets.won++;
      }

    const first = o.sets[0];
    if (first) {
      const bucket = first.own > first.rival ? scout.firstSet.wonFirst : scout.firstSet.lostFirst;
      bucket.played++;
      if (o.won) bucket.won++;
    }
  }

  scout.form = [...outcomes]
    .reverse()
    .slice(0, 5)
    .map((o) => ({ rivalId: o.rivalId, won: o.won, score: `${o.ownSets}-${o.rivalSets}`, home: o.home }));

  if (outcomes.length > 0) {
    const last = outcomes[outcomes.length - 1];
    let length = 0;
    for (let i = outcomes.length - 1; i >= 0 && outcomes[i].won === last.won; i--) length++;
    scout.streak = { won: last.won, length };
  }
  return scout;
}

// ─── Enfrentamientos ──────────────────────────────────────────

export type VersusSummary = {
  played: number;
  won: number;
  setsFor: number;
  setsAgainst: number;
  pointDiffPerSet: number | null;
  meetings: Outcome[];
};

function summarize(outcomes: Outcome[]): VersusSummary {
  return {
    played: outcomes.length,
    won: outcomes.filter((o) => o.won).length,
    setsFor: outcomes.reduce((a, o) => a + o.ownSets, 0),
    setsAgainst: outcomes.reduce((a, o) => a + o.rivalSets, 0),
    pointDiffPerSet: diffPerSet(pointTotals(outcomes)),
    meetings: outcomes,
  };
}

/** Enfrentamientos directos de `a` contra `b`, desde el punto de vista de `a`. */
export function headToHead(matches: CompetitionMatch[], a: number, b: number): VersusSummary {
  return summarize(outcomesOf(matches, a).filter((o) => o.rivalId === b));
}

export type CommonOpponent = {
  rivalId: number;
  a: VersusSummary;
  b: VersusSummary;
  /** Ventaja de `a` sobre `b` contra este rival (puntos por set; si no hay puntos, sets por partido). */
  edge: number;
};

/** Rivales contra los que han jugado los dos equipos (sin contar el duelo entre ellos). */
export function commonOpponents(matches: CompetitionMatch[], a: number, b: number): CommonOpponent[] {
  const oa = outcomesOf(matches, a).filter((o) => o.rivalId !== b);
  const ob = outcomesOf(matches, b).filter((o) => o.rivalId !== a);
  const shared = [...new Set(oa.map((o) => o.rivalId))].filter((id) => ob.some((o) => o.rivalId === id));

  return shared.map((rivalId) => {
    const sa = summarize(oa.filter((o) => o.rivalId === rivalId));
    const sb = summarize(ob.filter((o) => o.rivalId === rivalId));
    const setsPerMatch = (v: VersusSummary) => (v.setsFor - v.setsAgainst) / v.played;
    const edge =
      sa.pointDiffPerSet !== null && sb.pointDiffPerSet !== null
        ? sa.pointDiffPerSet - sb.pointDiffPerSet
        : setsPerMatch(sa) - setsPerMatch(sb);
    return { rivalId, a: sa, b: sb, edge };
  });
}

export type MatchScout = {
  home: TeamScout;
  away: TeamScout;
  /** Duelo directo ya jugado esta temporada, desde el punto de vista del local. */
  headToHead: VersusSummary;
  common: CommonOpponent[];
  /** Ventaja media del local sobre el visitante en los rivales comunes; null si no hay. */
  commonEdge: number | null;
  /** Diferencia de «puntos por set» entre local y visitante en toda la temporada; null si falta alguno. */
  ratingDiff: number | null;
  favoured: "home" | "away" | null;
  /** Poca muestra: menos de 3 partidos de alguno de los dos equipos. */
  lowSample: boolean;
};

/** Diferencia mínima de puntos por set para señalar un favorito. */
export const FAVOURITE_THRESHOLD = 1;

export function scoutMatch(matches: CompetitionMatch[], homeId: number, awayId: number): MatchScout {
  const home = scoutTeam(matches, homeId);
  const away = scoutTeam(matches, awayId);
  const common = commonOpponents(matches, homeId, awayId);
  const commonEdge = common.length ? common.reduce((a, c) => a + c.edge, 0) / common.length : null;
  const ratingDiff =
    home.pointDiffPerSet !== null && away.pointDiffPerSet !== null ? home.pointDiffPerSet - away.pointDiffPerSet : null;

  let favoured: MatchScout["favoured"] = null;
  if (ratingDiff !== null && Math.abs(ratingDiff) >= FAVOURITE_THRESHOLD) favoured = ratingDiff > 0 ? "home" : "away";

  return {
    home,
    away,
    headToHead: headToHead(matches, homeId, awayId),
    common,
    commonEdge,
    ratingDiff,
    favoured,
    lowSample: home.played < 3 || away.played < 3,
  };
}
