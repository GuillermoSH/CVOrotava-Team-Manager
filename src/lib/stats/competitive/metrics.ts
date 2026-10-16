import { viewFor, type CompMatch } from "./types";

export type TeamMetrics = {
  teamId: number;
  played: number;
  wins: number;
  setsPlayed: number;
  pointsFor: number;
  pointsAgainst: number;
  /** Sets decididos por 3 puntos o menos. */
  closeSets: number;
  closeSetWins: number;
  lostFirstSet: number;
  comebackWins: number;
  homePlayed: number;
  homeWins: number;
  awayPlayed: number;
  awayWins: number;
};

const CLOSE_SET_MARGIN = 3;

export function computeMetrics(teamId: number, matches: CompMatch[]): TeamMetrics {
  const m: TeamMetrics = {
    teamId,
    played: 0,
    wins: 0,
    setsPlayed: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    closeSets: 0,
    closeSetWins: 0,
    lostFirstSet: 0,
    comebackWins: 0,
    homePlayed: 0,
    homeWins: 0,
    awayPlayed: 0,
    awayWins: 0,
  };

  for (const match of matches) {
    const v = viewFor(match, teamId);
    if (!v) continue;
    m.played++;
    if (v.won) m.wins++;
    if (v.home) {
      m.homePlayed++;
      if (v.won) m.homeWins++;
    } else {
      m.awayPlayed++;
      if (v.won) m.awayWins++;
    }

    v.sets.forEach((set, i) => {
      m.setsPlayed++;
      m.pointsFor += set.own;
      m.pointsAgainst += set.rival;
      if (Math.abs(set.own - set.rival) <= CLOSE_SET_MARGIN) {
        m.closeSets++;
        if (set.own > set.rival) m.closeSetWins++;
      }
      if (i === 0 && set.own < set.rival) {
        m.lostFirstSet++;
        if (v.won) m.comebackWins++;
      }
    });
  }
  return m;
}

/** Posición relativa (0 = el peor, 1 = el mejor) entre `all`; null si hay menos de 3 equipos comparables. */
export function percentile(value: number, all: number[], higherIsBetter = true): number | null {
  if (all.length < 3) return null;
  let worse = 0;
  let equal = 0;
  for (const v of all) {
    if (v === value) equal++;
    else if (higherIsBetter ? v < value : v > value) worse++;
  }
  return (worse + (equal - 1) / 2) / (all.length - 1);
}

/** Escala 45–99 (nadie es un 0 en un juego de fichas). */
export const toRating99 = (pct: number): number => Math.round(45 + 54 * pct);

export type AttributeKey = "ATA" | "DEF" | "CIE" | "REM" | "LOC" | "VIA";

export type Attribute = {
  key: AttributeKey;
  label: string;
  /** 45–99, o null si no hay muestra suficiente. */
  value: number | null;
  /** Explicación con los números reales. */
  detail: string;
};

const fmt = (n: number) => n.toFixed(1).replace(".", ",");

type Def = {
  key: AttributeKey;
  label: string;
  higherIsBetter: boolean;
  minSample: number;
  sample: (t: TeamMetrics) => number;
  ratio: (t: TeamMetrics) => number;
  detail: (t: TeamMetrics) => string;
  weight: number;
};

export const ATTRIBUTE_DEFS: Def[] = [
  {
    key: "ATA", label: "Ataque", higherIsBetter: true, minSample: 12, weight: 0.15,
    sample: (t) => t.setsPlayed,
    ratio: (t) => t.pointsFor / t.setsPlayed,
    detail: (t) => `${fmt(t.pointsFor / t.setsPlayed)} puntos por set`,
  },
  {
    key: "DEF", label: "Defensa", higherIsBetter: false, minSample: 12, weight: 0.15,
    sample: (t) => t.setsPlayed,
    ratio: (t) => t.pointsAgainst / t.setsPlayed,
    detail: (t) => `${fmt(t.pointsAgainst / t.setsPlayed)} encajados por set`,
  },
  {
    key: "CIE", label: "Cierre", higherIsBetter: true, minSample: 4, weight: 0.1,
    sample: (t) => t.closeSets,
    ratio: (t) => t.closeSetWins / t.closeSets,
    detail: (t) => `${t.closeSetWins} de ${t.closeSets} sets ajustados ganados`,
  },
  {
    key: "REM", label: "Remontada", higherIsBetter: true, minSample: 2, weight: 0.05,
    sample: (t) => t.lostFirstSet,
    ratio: (t) => t.comebackWins / t.lostFirstSet,
    detail: (t) => `${t.comebackWins} de ${t.lostFirstSet} tras perder el 1.er set`,
  },
  {
    key: "LOC", label: "Casa", higherIsBetter: true, minSample: 2, weight: 0.075,
    sample: (t) => t.homePlayed,
    ratio: (t) => t.homeWins / t.homePlayed,
    detail: (t) => `${t.homeWins} victorias de ${t.homePlayed} en casa`,
  },
  {
    key: "VIA", label: "Viaje", higherIsBetter: true, minSample: 2, weight: 0.075,
    sample: (t) => t.awayPlayed,
    ratio: (t) => t.awayWins / t.awayPlayed,
    detail: (t) => `${t.awayWins} victorias de ${t.awayPlayed} fuera`,
  },
];

/** Atributos de un equipo comparado con el resto del grupo. */
export function attributesFor(team: TeamMetrics, all: TeamMetrics[]): Attribute[] {
  return ATTRIBUTE_DEFS.map((def) => {
    if (def.sample(team) < def.minSample) {
      return { key: def.key, label: def.label, value: null, detail: "Pocos partidos todavía" };
    }
    const pool = all.filter((t) => def.sample(t) >= def.minSample).map(def.ratio);
    const pct = percentile(def.ratio(team), pool, def.higherIsBetter);
    return {
      key: def.key,
      label: def.label,
      value: pct === null ? null : toRating99(pct),
      detail: def.detail(team),
    };
  });
}
