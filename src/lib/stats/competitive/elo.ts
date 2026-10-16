import { isPlayed, type CompMatch } from "./types";

/**
 * Rating tipo Elo por equipo dentro de un grupo de liga.
 *
 * Parámetros elegidos con 1.004 partidos de 6 temporadas reales (2020-21 a 2025-26,
 * ambas ligas), prediciendo cada partido solo con lo ocurrido antes:
 *  - el favorito gana el 78,7 % (el local gana el 54 %);
 *  - el orden final del rating coincide con la clasificación (Spearman 0,966);
 *  - la probabilidad mostrada está calibrada: prevista 55/64/75/85/95 %,
 *    real 55/61/80/90/95 %. Sin calibrar el modelo era demasiado tímido
 *    (decía 65 % y ganaba el 82 %), de ahí `sharpen`.
 * Volver a comprobar si cambia el formato de competición.
 */

export type EloConfig = {
  k: number;
  /** Cuánto del rating final del año pasado se conserva al arrancar (0 = todo a la media, 1 = completo). */
  carry: number;
  /** Puntos de ventaja de jugar en casa en la expectativa. */
  homeAdv: number;
  base: number;
  /** Divisor de la curva logística (400 en Elo clásico; menor = probabilidades más tajantes). */
  scale: number;
  /** Calibración de la probabilidad que se muestra (no cambia el rating): >1 = más tajante. */
  sharpen: number;
};

export const ELO_DEFAULT: EloConfig = {
  k: 32,
  carry: 0.75,
  homeAdv: 20,
  base: 1500,
  scale: 200,
  sharpen: 2,
};

export const expectedScore = (own: number, rival: number, bonus = 0, scale = 400): number =>
  1 / (1 + 10 ** ((rival - own - bonus) / scale));

/**
 * Probabilidad (calibrada) de que `own` gane a `rival`. `ownIsHome`: true/false si se
 * conoce el campo, null en terreno neutral. Nunca 0 % ni 100 %.
 */
export function winProbability(
  ownRating: number,
  rivalRating: number,
  ownIsHome: boolean | null,
  cfg: EloConfig = ELO_DEFAULT
): number {
  const bonus = ownIsHome === null ? 0 : ownIsHome ? cfg.homeAdv : -cfg.homeAdv;
  const p = Math.min(1 - 1e-9, Math.max(1e-9, expectedScore(ownRating, rivalRating, bonus, cfg.scale)));
  const sharp = 1 / (1 + Math.exp(-cfg.sharpen * Math.log(p / (1 - p))));
  return Math.min(0.97, Math.max(0.03, sharp));
}

/** 3-0 → 1, 3-1 → 0.83, 3-2 → 0.67 para el ganador (y el espejo para el perdedor). */
export function scoreFromSets(ownSets: number, rivalSets: number): number {
  const diff = ownSets - rivalSets;
  return 0.5 + 0.5 * Math.max(-1, Math.min(1, diff / 3));
}

export type EloRun = {
  final: Map<number, number>;
  /** Partidos jugados por equipo en esta ejecución. */
  played: Map<number, number>;
  /** Rating de cada equipo justo antes de cada partido. */
  before: Map<number, { home: number; away: number }>;
  /** Predicción del favorito (para validar): aciertos / partidos. */
  hits: number;
  total: number;
  logLoss: number;
};

export function runElo(
  matches: CompMatch[],
  seeds: Map<number, number>,
  cfg: EloConfig = ELO_DEFAULT
): EloRun {
  const rating = new Map(seeds);
  const get = (id: number) => rating.get(id) ?? cfg.base;
  const played = new Map<number, number>();
  const before = new Map<number, { home: number; away: number }>();
  let hits = 0;
  let total = 0;
  let logLoss = 0;

  const ordered = matches
    .filter(isPlayed)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);

  for (const m of ordered) {
    const rh = get(m.homeId);
    const ra = get(m.awayId);
    before.set(m.id, { home: rh, away: ra });

    const pHome = expectedScore(rh, ra, cfg.homeAdv, cfg.scale);
    const homeWon = m.homeSets! > m.awaySets!;
    total++;
    if (homeWon === pHome >= 0.5) hits++;
    logLoss += -Math.log(Math.max(1e-9, homeWon ? pHome : 1 - pHome));

    const sHome = scoreFromSets(m.homeSets!, m.awaySets!);
    const delta = cfg.k * (sHome - pHome);
    rating.set(m.homeId, rh + delta);
    rating.set(m.awayId, ra - delta);
    played.set(m.homeId, (played.get(m.homeId) ?? 0) + 1);
    played.set(m.awayId, (played.get(m.awayId) ?? 0) + 1);
  }

  return { final: rating, played, before, hits, total, logLoss };
}

/** Rating inicial de cada equipo: el final del año pasado, acercado a la media; sin referencia → media. */
export function seedRatings(
  teamIds: number[],
  keyOf: (teamId: number) => string,
  previousFinal: Map<string, number> | null,
  cfg: EloConfig = ELO_DEFAULT
): { seeds: Map<number, number>; hasPrior: Set<number> } {
  const seeds = new Map<number, number>();
  const hasPrior = new Set<number>();
  for (const id of teamIds) {
    const prev = previousFinal?.get(keyOf(id));
    if (prev === undefined) {
      seeds.set(id, cfg.base);
    } else {
      seeds.set(id, cfg.base + cfg.carry * (prev - cfg.base));
      hasPrior.add(id);
    }
  }
  return { seeds, hasPrior };
}
