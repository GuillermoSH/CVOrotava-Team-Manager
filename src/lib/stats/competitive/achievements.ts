import { leaguePointsFor } from "@/lib/fed/standings";
import { standingsOf, teamIdsOf } from "./standings";
import { isPlayed, viewFor, type CompMatch, type OurView } from "./types";

export type Achievement = {
  id: string;
  family: string;
  name: string;
  /** Criterio exacto, siempre visible. */
  description: string;
  /** 1 = bronce, 2 = plata, 3 = oro (solo en familias con varios niveles). */
  tier: 1 | 2 | 3 | null;
  unlocked: boolean;
  /** Fecha del partido que lo desbloqueó. */
  unlockedOn: string | null;
  /** Progreso hacia el siguiente hito; null si no es medible. */
  progress: { value: number; target: number } | null;
};

type Seq = { v: OurView; index: number };

/** Primera fecha en que un contador acumulado alcanza `target` (null si nunca). */
function reachedOn(seq: Seq[], valueAt: (i: number) => number, target: number): string | null {
  for (const s of seq) if (valueAt(s.index) >= target) return s.v.match.date;
  return null;
}

function runningStreaks(views: OurView[], pred: (v: OurView) => boolean): number[] {
  const out: number[] = [];
  let run = 0;
  for (const v of views) {
    run = pred(v) ? run + 1 : 0;
    out.push(run);
  }
  return out;
}

const cumulative = (views: OurView[], pred: (v: OurView, i: number) => boolean): number[] => {
  let n = 0;
  return views.map((v, i) => (pred(v, i) ? ++n : n));
};

export function ourViewsOf(matches: CompMatch[], ourIds: Set<number>): OurView[] {
  const views: OurView[] = [];
  for (const m of matches) {
    const side = ourIds.has(m.homeId) ? m.homeId : ourIds.has(m.awayId) ? m.awayId : null;
    if (side === null) continue;
    const v = viewFor(m, side);
    if (v) views.push(v);
  }
  return views.sort((a, b) => a.match.date.localeCompare(b.match.date) || a.match.id - b.match.id);
}

export function bestWinStreak(views: OurView[]): number {
  return Math.max(0, ...runningStreaks(views, (v) => v.won));
}

type Input = {
  /**
   * Todos nuestros partidos jugados esta temporada (cualquier competición), por fecha.
   * Los logros cuentan solo los del grupo principal, salvo «Venganza» (todas).
   */
  views: OurView[];
  /** Partidos del grupo principal (todos los equipos), para saber el puesto del rival en cada momento. */
  groupMatches: CompMatch[];
  groupId: number;
  /** Puntos de liga totales de la temporada anterior, si hay. */
  previousLeaguePoints: number | null;
  leaguePointsNow: number;
};

export function buildAchievements(input: Input): Achievement[] {
  const { groupMatches, groupId } = input;
  const all = input.views;
  const views = all.filter((v) => v.match.groupId === groupId);
  const out: Achievement[] = [];

  type AddFn = (
    a: Omit<Achievement, "unlocked" | "unlockedOn" | "progress">,
    valueAt: (i: number) => number,
    target: number,
    total: number
  ) => void;

  const adder = (list: OurView[]): AddFn => {
    const seq: Seq[] = list.map((v, index) => ({ v, index }));
    return (a, valueAt, target, total) => {
      const on = reachedOn(seq, valueAt, target);
      out.push({
        ...a,
        unlocked: on !== null,
        unlockedOn: on,
        progress: on === null ? { value: Math.min(total, target - 1), target } : { value: target, target },
      });
    };
  };
  const add = adder(views);
  const addAll = adder(all);

  // ── Rachas de victorias ──────────────────────────────────────────────
  const streak = runningStreaks(views, (v) => v.won);
  const bestStreak = Math.max(0, ...streak);
  for (const [tier, n] of [[1, 3], [2, 5], [3, 8]] as const)
    add({ id: `racha-${n}`, family: "racha", name: `Racha de ${n}`, description: `Ganar ${n} partidos seguidos`, tier }, (i) => streak[i], n, bestStreak);

  // ── Barridas: victorias 3-0 ──────────────────────────────────────────
  const sweeps = cumulative(views, (v) => v.won && v.rivalSets === 0);
  const sweepTotal = sweeps.at(-1) ?? 0;
  add({ id: "barrida", family: "barrida", name: "Barrida", description: "3 victorias por 3-0", tier: 1 }, (i) => sweeps[i], 3, sweepTotal);
  add({ id: "rodillo", family: "barrida", name: "Rodillo", description: "6 victorias por 3-0", tier: 2 }, (i) => sweeps[i], 6, sweepTotal);

  // ── Remontadas: ganar tras perder el primer set ──────────────────────
  const comebacks = cumulative(views, (v) => v.won && v.sets.length > 0 && v.sets[0].own < v.sets[0].rival);
  const comebackTotal = comebacks.at(-1) ?? 0;
  add({ id: "remontada", family: "remontada", name: "Remontada", description: "Ganar un partido tras perder el 1.er set", tier: 1 }, (i) => comebacks[i], 1, comebackTotal);
  add({ id: "resurreccion", family: "remontada", name: "Resurrección", description: "3 partidos ganados tras perder el 1.er set", tier: 2 }, (i) => comebacks[i], 3, comebackTotal);

  // ── Sangre fría: ganar partidos al quinto set ────────────────────────
  const fiveSet = cumulative(views, (v) => v.won && v.ownSets + v.rivalSets === 5);
  const fiveSetTotal = fiveSet.at(-1) ?? 0;
  add({ id: "sangre-fria", family: "sangre-fria", name: "Sangre fría", description: "Ganar un partido al quinto set", tier: 1 }, (i) => fiveSet[i], 1, fiveSetTotal);
  add({ id: "nervios-de-acero", family: "sangre-fria", name: "Nervios de acero", description: "3 partidos ganados al quinto set", tier: 2 }, (i) => fiveSet[i], 3, fiveSetTotal);

  // ── Cazagigantes: ganar a un top 3 (puesto antes del partido) ────────
  const inGroup = groupMatches.filter((m) => m.groupId === groupId);
  const groupIds = teamIdsOf(inGroup);
  const topWins = cumulative(views, (v) => {
    if (!v.won) return false;
    const before = inGroup.filter((m) => isPlayed(m) && (m.date < v.match.date || (m.date === v.match.date && m.id < v.match.id)));
    if (before.length === 0) return false;
    const rank = standingsOf(groupIds, before).find((r) => r.team_id === v.rivalId);
    return rank !== undefined && rank.played > 0 && rank.position <= 3;
  });
  add({ id: "cazagigantes", family: "cazagigantes", name: "Cazagigantes", description: "Ganar a un equipo del top 3 de la liga", tier: null }, (i) => topWins[i], 1, topWins.at(-1) ?? 0);

  // ── Venganza: ganar a quien ya nos había ganado esta temporada (cualquier competición) ──
  const lostTo = new Set<number>();
  const revenge = cumulative(all, (v) => {
    const avenged = v.won && lostTo.has(v.rivalId);
    if (!v.won) lostTo.add(v.rivalId);
    return avenged;
  });
  addAll(
    { id: "venganza", family: "venganza", name: "Venganza", description: "Ganar a un rival que nos había ganado esta temporada, en cualquier competición", tier: null },
    (i) => revenge[i],
    1,
    revenge.at(-1) ?? 0
  );

  // ── Fortín: victorias seguidas en casa ───────────────────────────────
  const homeViews = views.filter((v) => v.home);
  const homeStreakByMatch = new Map<number, number>();
  runningStreaks(homeViews, (v) => v.won).forEach((n, i) => homeStreakByMatch.set(homeViews[i].match.id, n));
  let carry = 0;
  const homeStreak = views.map((v) => (v.home ? (carry = homeStreakByMatch.get(v.match.id) ?? 0) : carry));
  add({ id: "fortin", family: "fortin", name: "Fortín", description: "5 victorias seguidas en casa", tier: null }, (i) => homeStreak[i], 5, Math.max(0, ...homeStreak));

  // ── Viajero: victorias como visitante ────────────────────────────────
  const awayWins = cumulative(views, (v) => !v.home && v.won);
  add({ id: "viajero", family: "viajero", name: "Viajero", description: "Ganar 3 partidos como visitante", tier: null }, (i) => awayWins[i], 3, awayWins.at(-1) ?? 0);

  // ── Muralla: ganar un set encajando 12 puntos o menos ────────────────
  const wall = cumulative(views, (v) => v.sets.some((s) => s.own > s.rival && s.rival <= 12));
  add({ id: "muralla", family: "muralla", name: "Muralla", description: "Ganar un set encajando 12 puntos o menos", tier: null }, (i) => wall[i], 1, wall.at(-1) ?? 0);

  // ── Superar el año pasado ────────────────────────────────────────────
  if (input.previousLeaguePoints !== null) {
    const target = input.previousLeaguePoints + 1;
    let pts = 0;
    const points = views.map((v) => (pts += leaguePointsFor(v.ownSets, v.rivalSets)));
    add({ id: "supera-el-ano-pasado", family: "ano-pasado", name: "Mejor que el año pasado", description: `Superar los ${input.previousLeaguePoints} puntos de liga de la temporada pasada`, tier: null }, (i) => points[i], target, input.leaguePointsNow);
  }

  return out;
}
