import type { ReportRallies, ReportScore, ReportSide, ReportSet } from "./report";

/**
 * Análisis del marcador jugada a jugada de un set (`ReportRallies`). Todo se mide desde un equipo
 * (`mine`): «propios» son sus puntos y «rival» los del otro. Puro: no lee nada.
 */

export type Run = {
  /** Jugadas seguidas ganadas. */
  length: number;
  /** Marcador justo antes de empezar la racha y justo al acabarla. */
  from: ReportScore;
  to: ReportScore;
};

export type SetFlow = {
  /** Marcador tras cada jugada (el índice 0 es 0-0), visto desde el equipo. */
  scores: ReportScore[];
  won: boolean;
  runFor: Run | null;
  runAgainst: Run | null;
  /** Mayor ventaja propia y mayor desventaja (en puntos, positivos) en algún momento del set. */
  maxLead: number;
  maxDeficit: number;
  /** Veces que cambia quién va por delante (los empates no cuentan como cambio). */
  leadChanges: number;
  /** Jugadas en que sacó el equipo y las que ganó; y al revés, las que recibió y ganó (cambio de saque). */
  serve: { won: number; of: number };
  receive: { won: number; of: number };
  /** El set llegó a un final apretado: los dos equipos pasaron de (objetivo − 5), es decir 20-20 o 10-10 en el quinto. */
  closeFinish: boolean;
};

const target = (setNumber: number) => (setNumber === 5 ? 15 : 25);

export function setFlow(rallies: ReportRallies, mine: ReportSide, setNumber: number): SetFlow {
  const scores: ReportScore[] = [{ own: 0, opp: 0 }];
  let own = 0;
  let opp = 0;
  const serve = { won: 0, of: 0 };
  const receive = { won: 0, of: 0 };
  let leadChanges = 0;
  let lastLeader = 0; // 1 propio, -1 rival
  let maxLead = 0;
  let maxDeficit = 0;
  let closeFinish = false;
  let runFor: Run | null = null;
  let runAgainst: Run | null = null;
  let current: { who: ReportSide; length: number; from: ReportScore } | null = null;
  const close = target(setNumber) - 5;

  rallies.winners.forEach((w, k) => {
    const server = k === 0 ? rallies.first : rallies.winners[k - 1];
    const wonByMine = w === mine;
    if (server === mine) {
      serve.of++;
      if (wonByMine) serve.won++;
    } else {
      receive.of++;
      if (wonByMine) receive.won++;
    }
    const before = { own, opp };
    if (wonByMine) own++;
    else opp++;
    scores.push({ own, opp });

    if (current && current.who === w) current.length++;
    else current = { who: w, length: 1, from: before };
    const run: Run = { length: current.length, from: current.from, to: { own, opp } };
    if (wonByMine) {
      if (!runFor || run.length > runFor.length) runFor = run;
    } else if (!runAgainst || run.length > runAgainst.length) runAgainst = run;

    const diff = own - opp;
    maxLead = Math.max(maxLead, diff);
    maxDeficit = Math.max(maxDeficit, -diff);
    const leader = Math.sign(diff);
    if (leader !== 0) {
      if (lastLeader !== 0 && leader !== lastLeader) leadChanges++;
      lastLeader = leader;
    }
    if (Math.min(own, opp) >= close) closeFinish = true;
  });

  return { scores, won: own > opp, runFor, runAgainst, maxLead, maxDeficit, leadChanges, serve, receive, closeFinish };
}

/**
 * Índice (jugadas jugadas) en que se llegó a un marcador visto desde un equipo, o null si el marcador no
 * está en el desarrollo del set (el tiempo muerto o el cambio no cuadra con lo reconstruido).
 */
export function indexOfScore(flow: SetFlow, score: ReportScore): number | null {
  const k = score.own + score.opp;
  const at = flow.scores[k];
  return at && at.own === score.own && at.opp === score.opp ? k : null;
}

/** Qué pasa justo después de un tiempo muerto pedido con ese marcador (visto desde quien lo pide). */
export function afterTimeout(rallies: ReportRallies, mine: ReportSide, flow: SetFlow, score: ReportScore): { nextWon: boolean; rivalRun: number } | null {
  const k = indexOfScore(flow, score);
  if (k === null || k >= rallies.winners.length) return null;
  let rivalRun = 0;
  for (let j = k - 1; j >= 0 && rallies.winners[j] !== mine; j--) rivalRun++;
  return { nextWon: rallies.winners[k] === mine, rivalRun };
}

/** Atajo para pintar: el set de un acta visto desde un lado, o null si no hay marcador jugada a jugada. */
export function flowOf(set: ReportSet, mine: ReportSide): SetFlow | null {
  return set.rallies ? setFlow(set.rallies, mine, set.number) : null;
}
