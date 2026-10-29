import { colOf, isInt, ROT_LEFT, ROT_RIGHT, within, type Panel } from "./layout";
import type { ActaData, ActaItem, ServiceCells, Side } from "./types";

/**
 * Marcador tanto a tanto de un set, reconstruido de las «rondas de saque» de la hoja.
 *
 * Cada equipo anota en su panel, por turnos de saque (cuatro filas de seis columnas, en el orden de
 * rotación), el marcador PROPIO al acabar cada turno. El equipo que recibe primero lleva una «X» en la
 * primera casilla. La última casilla es el marcador final del equipo, aunque su último turno fuera de cero puntos
 * (ganar el último punto al recibir). De los turnos de los dos equipos sale quién ganó cada jugada, y todo se
 * comprueba: los turnos de uno y otro tienen que encajar entre sí y terminar en el resultado del set.
 */


const ROW_STEP = 12.1;
const ROW0 = 45.6;
const ROWS = 4;

/**
 * En el set 5 el equipo de la izquierda, tras el cambio de campo, sigue anotando en un panel gemelo a la derecha
 * (sin «Inicio:»), en la misma fila y columna que dejó en blanco en el principal.
 */
const TIEBREAK_DX = 291;

/** Casillas de rondas de saque de un lado del panel; null si no se pueden leer. */
export function readServiceCells(items: ActaItem[], panel: Panel, which: "left" | "right"): ServiceCells | null {
  const { x0, y0 } = panel;
  const yLine = items.find((i) => i.s.trim() === "14" && within(i.x, x0 + 3, x0 + 15) && within(i.y, y0 + 12, y0 + 40))?.y;
  if (yLine === undefined) return null;
  const base = which === "left" ? ROT_LEFT : ROT_RIGHT;
  const offsets = base.map((o) => o - 4 * (which === "left" ? 1 : 1.3));
  const grid = (originX: number): (number | "X" | null)[][] =>
    Array.from({ length: ROWS }, (_, r) => {
      const y = yLine + ROW0 + ROW_STEP * r;
      const row: (number | "X" | null)[] = Array(6).fill(null);
      for (const i of items) {
        if (!within(i.y, y - 4, y + 4)) continue;
        const t = i.s.trim();
        if (t !== "X" && !isInt(t)) continue;
        const c = colOf(i.x, originX, offsets);
        if (c >= 0) row[c] = t === "X" ? "X" : Number(t);
      }
      return row;
    });

  const main = grid(x0);
  const extra = panel.set === 5 && which === "left" ? grid(x0 + TIEBREAK_DX) : null;
  const cells: (number | "X")[] = [];
  main.forEach((row, r) =>
    row.forEach((v, c) => {
      const w = v ?? extra?.[r][c] ?? null;
      if (w !== null) cells.push(w);
    })
  );
  if (cells.length < 2) return null;
  const first = cells[0] !== "X";
  const nums = cells.filter((v): v is number => v !== "X");
  if (nums.length < 1) return null;
  return { first, ends: nums, final: nums[nums.length - 1] };
}

export type Timeline = { winners: Side[]; ok: true } | { ok: false; reason: string };

/** Quién ganó cada jugada (A o B, en orden); falla con el motivo si los turnos de los dos equipos no encajan. */
export function buildTimeline(a: ServiceCells, b: ServiceCells, finals: { A: number; B: number }): Timeline {
  if (a.first === b.first) return { ok: false, reason: "los dos equipos dicen sacar primero o recibir primero" };
  const cells: Record<Side, number[]> = { A: [...a.ends], B: [...b.ends] };
  if (a.final !== finals.A || b.final !== finals.B) return { ok: false, reason: `casilla final ${a.final}-${b.final} y resultado ${finals.A}-${finals.B}` };
  const other = (s: Side): Side => (s === "A" ? "B" : "A");
  const score: Record<Side, number> = { A: 0, B: 0 };
  const idx: Record<Side, number> = { A: 0, B: 0 };
  const winners: Side[] = [];
  let s: Side = a.first ? "A" : "B";
  for (let guard = 0; guard < 120; guard++) {
    const end = cells[s][idx[s]];
    if (end === undefined) return { ok: false, reason: `${s} no tiene más turnos y el marcador es ${score.A}-${score.B}` };
    if (end < score[s]) return { ok: false, reason: `turno de ${s} acaba en ${end} con el marcador propio en ${score[s]}` };
    for (let k = score[s]; k < end; k++) winners.push(s);
    score[s] = end;
    idx[s]++;
    if (score.A === finals.A && score.B === finals.B && idx.A === cells.A.length && idx.B === cells.B.length) return { ok: true, winners };
    // El rival gana la jugada y con ella el saque
    const o = other(s);
    score[o]++;
    winners.push(o);
    s = o;
  }
  return { ok: false, reason: "demasiados turnos" };
}

/** Copia del acta con el marcador jugada a jugada de cada set cuyas rondas de saque encajan con su resultado. */
export function attachRallies(data: ActaData): ActaData {
  const out = structuredClone(data);
  for (const set of out.sets) {
    const { A, B } = set.service;
    if (!A || !B) continue;
    const tl = buildTimeline(A, B, { A: set.summary.A.points, B: set.summary.B.points });
    set.rallies = tl.ok ? { first: A.first ? "A" : "B", winners: tl.winners } : null;
  }
  return out;
}
