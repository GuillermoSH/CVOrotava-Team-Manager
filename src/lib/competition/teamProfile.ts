import type { CompetitionMatch } from "./build";
import type { MatchReport, ReportScore, ReportSet, ReportSetSide, ReportSide } from "./report";

/**
 * Ficha de un equipo de la competición: lo que se puede decir de él agregando sus partidos de la
 * temporada. Los resultados salen de todos los partidos jugados; el detalle (tiempos muertos, cambios,
 * alineaciones, plantilla) solo de los que tienen acta leída, que son los que cuentan en `reports`.
 * Puro: no lee nada, recibe los partidos y las actas ya cargadas.
 */

export type ProfileMatch = { match: CompetitionMatch; report: MatchReport | null };

/** Pocas actas para sacar conclusiones: la ficha lo avisa en vez de callarlo. */
export const SMALL_SAMPLE = 3;

export type Ratio = { n: number; of: number };

export type PhaseCounts = { early: number; mid: number; late: number };

export type ProfileTimeouts = {
  total: number;
  /** Sets con acta en los que se ha podido leer algo. */
  sets: number;
  perSet: number | null;
  /** Diferencia media de marcador al pedirlo (positivo: va por delante). */
  avgLead: number | null;
  /** Al pedirlo iba perdiendo por 3 o más puntos / ganando por 3 o más. */
  trailing3: Ratio;
  leading3: Ratio;
  /** En qué parte del set: por debajo del 40 % del objetivo, hasta el 80 % y el resto. */
  phase: PhaseCounts;
  /** De los sets en que pidió alguno, en cuántos fue el primer tiempo muerto del set (de los dos equipos). */
  first: Ratio;
};

export type ProfileSubstitutions = {
  total: number;
  perSet: number | null;
  phase: PhaseCounts;
  /** Veces por posición del campo (I a VI). */
  byPosition: number[];
  /** Cambios en los que el titular vuelve a su puesto. */
  returned: Ratio;
  /** Quién entra más. */
  topIn: { name: string; times: number }[];
};

export type ProfileSextet = {
  numbers: number[];
  names: string[];
  /** Sets con esta alineación y orden de rotación (empezando por el dorsal menor). */
  count: number;
  share: number;
};

export type ProfileLineups = {
  /** Sets con la alineación inicial escrita. */
  sets: number;
  sextets: ProfileSextet[];
  /** Cuántos sextetos distintos ha usado (sin contar el orden de rotación). */
  distinctSextets: number;
  startsServing: Ratio;
};

export type ProfilePlayer = { name: string; number: number; libero: boolean; starts: number; subIns: number; matches: number };

export type ProfileSets = {
  played: number;
  won: number;
  firstSet: Ratio;
  /** Sets decididos por 2 puntos o menos (25-23 o más ajustados). */
  tight: Ratio;
  /** Quinto set jugado y ganado. */
  decider: Ratio;
  avgFor: number | null;
  avgAgainst: number | null;
  avgDurationMin: number | null;
};

export type TeamProfile = {
  teamId: number;
  played: number;
  withReport: number;
  smallSample: boolean;
  record: { won: number; lost: number; setsFor: number; setsAgainst: number; wins30: number; wins32: number; losses03: number; losses23: number };
  sets: ProfileSets;
  timeouts: ProfileTimeouts;
  substitutions: ProfileSubstitutions;
  lineups: ProfileLineups;
  players: ProfilePlayer[];
  coaches: string[];
  sanctions: { W: number; P: number; E: number; D: number };
};

const ratio = (n: number, of: number): Ratio => ({ n, of });
const avg = (xs: number[]): number | null => (xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length);
const target = (setNumber: number) => (setNumber === 5 ? 15 : 25);

function phaseOf(score: ReportScore, setNumber: number): keyof PhaseCounts {
  const f = Math.max(score.own, score.opp) / target(setNumber);
  return f < 0.4 ? "early" : f < 0.8 ? "mid" : "late";
}

/** Orden de rotación de un sexteto: los dorsales por posición, girados para empezar por el menor. */
function rotationKey(lineup: number[]): number[] {
  const six = lineup.slice(0, 6);
  const min = Math.min(...six);
  const i = six.indexOf(min);
  return [...six.slice(i), ...six.slice(0, i)];
}

type SetView = { set: ReportSet; mine: ReportSide; me: ReportSetSide; rival: ReportSetSide; match: ProfileMatch };

export function buildTeamProfile(teamId: number, matches: ProfileMatch[]): TeamProfile {
  const played = matches.filter((m) => m.match.status === "played" && (m.match.homeId === teamId || m.match.awayId === teamId));
  const sideOf = (m: CompetitionMatch): ReportSide => (m.homeId === teamId ? "home" : "away");

  // ─ Resultados y sets: de todos los partidos jugados, con o sin acta ─
  const record = { won: 0, lost: 0, setsFor: 0, setsAgainst: 0, wins30: 0, wins32: 0, losses03: 0, losses23: 0 };
  const setStats = { played: 0, won: 0, first: ratio(0, 0), tight: ratio(0, 0), decider: ratio(0, 0) };
  const pointsFor: number[] = [];
  const pointsAgainst: number[] = [];
  for (const { match } of played) {
    const mine = sideOf(match);
    const sf = (mine === "home" ? match.homeSets : match.awaySets) ?? 0;
    const sa = (mine === "home" ? match.awaySets : match.homeSets) ?? 0;
    record.setsFor += sf;
    record.setsAgainst += sa;
    if (sf > sa) {
      record.won++;
      if (sa === 0) record.wins30++;
      else if (sa === 2) record.wins32++;
    } else {
      record.lost++;
      if (sf === 0) record.losses03++;
      else if (sf === 2) record.losses23++;
    }
    match.sets.forEach((s, i) => {
      const f = mine === "home" ? s.home : s.away;
      const a = mine === "home" ? s.away : s.home;
      setStats.played++;
      pointsFor.push(f);
      pointsAgainst.push(a);
      const won = f > a;
      if (won) setStats.won++;
      if (i === 0) setStats.first = ratio(setStats.first.n + (won ? 1 : 0), setStats.first.of + 1);
      if (Math.abs(f - a) <= 2) setStats.tight = ratio(setStats.tight.n + (won ? 1 : 0), setStats.tight.of + 1);
      if (i === 4) setStats.decider = ratio(setStats.decider.n + (won ? 1 : 0), setStats.decider.of + 1);
    });
  }

  // ─ Detalle: de las actas leídas ─
  const withReport = played.filter((m) => m.report !== null);
  const views: SetView[] = withReport.flatMap((pm) => {
    const mine = sideOf(pm.match);
    const rival: ReportSide = mine === "home" ? "away" : "home";
    return pm.report!.sets.map((set) => ({ set, mine, me: set[mine], rival: set[rival], match: pm }));
  });

  // Tiempos muertos
  const tScores = views.flatMap((v) => v.me.timeouts.map((t) => ({ t, n: v.set.number })));
  const firstOf = (side: ReportSetSide): number | null => (side.timeouts.length === 0 ? null : Math.min(...side.timeouts.map((t) => t.own + t.opp)));
  let firstN = 0;
  let firstSets = 0;
  for (const v of views) {
    const mineFirst = firstOf(v.me);
    if (mineFirst === null) continue;
    firstSets++;
    const rivalFirst = firstOf(v.rival);
    if (rivalFirst === null || mineFirst < rivalFirst) firstN++;
  }
  const tPhase: PhaseCounts = { early: 0, mid: 0, late: 0 };
  for (const { t, n } of tScores) tPhase[phaseOf(t, n)]++;
  const timeouts: ProfileTimeouts = {
    total: tScores.length,
    sets: views.length,
    perSet: views.length ? tScores.length / views.length : null,
    avgLead: avg(tScores.map(({ t }) => t.own - t.opp)),
    trailing3: ratio(tScores.filter(({ t }) => t.opp - t.own >= 3).length, tScores.length),
    leading3: ratio(tScores.filter(({ t }) => t.own - t.opp >= 3).length, tScores.length),
    phase: tPhase,
    first: ratio(firstN, firstSets),
  };

  // Cambios
  const rosterName = (v: SetView, n: number | null): string | null =>
    n === null ? null : (v.match.report!.players[v.mine].find((p) => p.number === n)?.name ?? null);
  const sPhase: PhaseCounts = { early: 0, mid: 0, late: 0 };
  const byPosition = Array<number>(6).fill(0);
  let subsTotal = 0;
  let returned = 0;
  const entered = new Map<string, number>();
  for (const v of views) {
    for (const s of v.me.substitutions) {
      subsTotal++;
      sPhase[phaseOf(s.scoreIn, v.set.number)]++;
      if (s.position >= 1 && s.position <= 6) byPosition[s.position - 1]++;
      if (s.scoreBack) returned++;
      const name = rosterName(v, s.playerIn);
      if (name) entered.set(name, (entered.get(name) ?? 0) + 1);
    }
  }
  const substitutions: ProfileSubstitutions = {
    total: subsTotal,
    perSet: views.length ? subsTotal / views.length : null,
    phase: sPhase,
    byPosition,
    returned: ratio(returned, subsTotal),
    topIn: [...entered].map(([name, times]) => ({ name, times })).sort((a, b) => b.times - a.times || a.name.localeCompare(b.name)).slice(0, 5),
  };

  // Alineaciones iniciales
  const withLineup = views.filter((v) => v.me.lineup.length === 6 && v.me.lineup.every((n) => n > 0));
  const sextets = new Map<string, { numbers: number[]; names: string[]; count: number }>();
  const distinct = new Set<string>();
  for (const v of withLineup) {
    const key = rotationKey(v.me.lineup);
    distinct.add([...v.me.lineup].sort((a, b) => a - b).join("-"));
    const id = key.join("-");
    const cur = sextets.get(id) ?? { numbers: key, names: key.map((n) => rosterName(v, n) ?? `Nº ${n}`), count: 0 };
    cur.count++;
    sextets.set(id, cur);
  }
  const serving = views.filter((v) => v.me.startsServing !== null);
  const lineups: ProfileLineups = {
    sets: withLineup.length,
    sextets: [...sextets.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((s) => ({ ...s, share: s.count / withLineup.length })),
    distinctSextets: distinct.size,
    startsServing: ratio(serving.filter((v) => v.me.startsServing).length, serving.length),
  };

  // Plantilla: quién sale de inicio y quién entra desde el banquillo (por nombre, el dorsal puede repetirse entre equipos)
  const people = new Map<string, { name: string; numbers: Map<number, number>; libero: boolean; starts: number; subIns: number; matches: Set<number> }>();
  const person = (name: string) => {
    const cur = people.get(name) ?? { name, numbers: new Map(), libero: false, starts: 0, subIns: 0, matches: new Set<number>() };
    people.set(name, cur);
    return cur;
  };
  for (const pm of withReport) {
    const mine = sideOf(pm.match);
    for (const p of pm.report!.players[mine]) {
      const cur = person(p.name);
      cur.numbers.set(p.number, (cur.numbers.get(p.number) ?? 0) + 1);
      cur.libero ||= p.libero;
      cur.matches.add(pm.match.id);
    }
  }
  for (const v of views) {
    for (const n of v.me.lineup) {
      const name = rosterName(v, n);
      if (name) person(name).starts++;
    }
    for (const s of v.me.substitutions) {
      const name = rosterName(v, s.playerIn);
      if (name) person(name).subIns++;
    }
  }
  const players: ProfilePlayer[] = [...people.values()]
    .map((p) => ({
      name: p.name,
      number: [...p.numbers].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0,
      libero: p.libero,
      starts: p.starts,
      subIns: p.subIns,
      matches: p.matches.size,
    }))
    .sort((a, b) => b.starts - a.starts || b.subIns - a.subIns || b.matches - a.matches || a.name.localeCompare(b.name));

  const sanctions = { W: 0, P: 0, E: 0, D: 0 };
  const coaches = new Map<string, number>();
  for (const pm of withReport) {
    const mine = sideOf(pm.match);
    for (const s of pm.report!.sanctions) if (s.side === mine) sanctions[s.kind]++;
    for (const s of pm.report!.staff[mine]) if (s.role === "E") coaches.set(s.name, (coaches.get(s.name) ?? 0) + 1);
  }

  return {
    teamId,
    played: played.length,
    withReport: withReport.length,
    smallSample: withReport.length < SMALL_SAMPLE,
    record,
    sets: {
      played: setStats.played,
      won: setStats.won,
      firstSet: setStats.first,
      tight: setStats.tight,
      decider: setStats.decider,
      avgFor: avg(pointsFor),
      avgAgainst: avg(pointsAgainst),
      avgDurationMin: avg(views.map((v) => v.set.durationMin).filter((d): d is number => d !== null)),
    },
    timeouts,
    substitutions,
    lineups,
    players,
    coaches: [...coaches].sort((a, b) => b[1] - a[1]).map(([name]) => name),
    sanctions,
  };
}
