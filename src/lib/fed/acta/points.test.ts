import { describe, expect, it } from "vitest";
import { parseActa } from "./parse";
import { attachRallies, buildTimeline } from "./points";
import type { ActaData, ActaItem, ServiceCells, Side } from "./types";
import a145743000 from "./__fixtures__/145743000.json";
import a143401275 from "./__fixtures__/143401275.json";
import a143401283 from "./__fixtures__/143401283.json";

const items = (raw: unknown): ActaItem[] => (raw as [string, number, number][]).map(([s, x, y]) => ({ s, x, y }));
const cells = (first: boolean, ends: number[]): ServiceCells => ({ first, ends, final: ends[ends.length - 1] });

/** Marcadores (A, B) por los que pasa el set. */
function visited(winners: Side[]): Set<string> {
  const seen = new Set(["0:0"]);
  let a = 0;
  let b = 0;
  for (const w of winners) {
    if (w === "A") a++;
    else b++;
    seen.add(`${a}:${b}`);
  }
  return seen;
}

describe("buildTimeline", () => {
  // Set 1 de un acta real (25-21): Tacoronte saca primero, Viajes recibe. Cada casilla es el marcador propio al acabar un turno.
  const tacoronte = cells(true, [0, 2, 6, 7, 8, 9, 11, 12, 14, 17, 19, 22, 24, 25]);
  const viajes = cells(false, [1, 2, 3, 5, 6, 9, 12, 13, 16, 18, 19, 20, 21]);

  it("reconstruye quién ganó cada jugada", () => {
    const tl = buildTimeline(tacoronte, viajes, { A: 25, B: 21 });
    expect(tl.ok).toBe(true);
    if (!tl.ok) return;
    expect(tl.winners).toHaveLength(46);
    expect(tl.winners.filter((w) => w === "A")).toHaveLength(25);
    expect(tl.winners.filter((w) => w === "B")).toHaveLength(21);
    // Tacoronte pierde la primera jugada (turno en 0); Viajes gana el saque y acaba en 1; Tacoronte lo recupera: 1, y gana otra: 2
    expect(tl.winners.slice(0, 4)).toEqual(["B", "A", "A", "B"]);
  });

  it("pasa por los marcadores de los tiempos muertos anotados aparte en la hoja", () => {
    const tl = buildTimeline(tacoronte, viajes, { A: 25, B: 21 });
    if (!tl.ok) throw new Error(tl.reason);
    const seen = visited(tl.winners);
    expect(seen.has("14:16")).toBe(true); // Tacoronte pidió tiempo con 14:16
    expect(seen.has("21:19")).toBe(true); // Viajes pidió con 19:21 (propios:rival)
    expect(seen.has("24:20")).toBe(true); // y con 20:24
  });

  it("falla con el motivo si no encaja", () => {
    expect(buildTimeline(tacoronte, viajes, { A: 25, B: 20 })).toMatchObject({ ok: false });
    expect(buildTimeline(tacoronte, cells(true, [1, 2]), { A: 25, B: 2 })).toMatchObject({ ok: false, reason: expect.stringContaining("primero") });
    const broken = cells(false, [1, 2, 3, 5, 6, 9, 12, 13, 16, 18, 19, 20, 20, 21]);
    expect(buildTimeline(tacoronte, broken, { A: 25, B: 21 }).ok).toBe(false);
  });

  it("gana el set recibiendo: el último punto no necesita saque", () => {
    // A saca primero: pierde (0); B gana y su turno acaba en 1; A gana el saque (1) y acaba en 1; B gana (2) y acaba en 2...
    const tl = buildTimeline(cells(true, [0, 1]), cells(false, [1, 2]), { A: 1, B: 2 });
    expect(tl).toMatchObject({ ok: true });
    if (tl.ok) expect(tl.winners).toEqual(["B", "A", "B"]);
  });
});

describe("rondas de saque de actas reales", () => {
  const read = (raw: unknown): ActaData => attachRallies(parseActa(items(raw)).data as ActaData);

  it("las rondas de saque de cada panel salen del acta y encajan con el resultado", () => {
    for (const raw of [a145743000, a143401275]) {
      const data = read(raw);
      const withRallies = data.sets.filter((s) => s.rallies);
      expect(withRallies.length).toBeGreaterThanOrEqual(data.sets.length - 1);
      for (const set of withRallies) {
        const w = set.rallies!.winners;
        expect(w.filter((x) => x === "A")).toHaveLength(set.summary.A.points);
        expect(w.filter((x) => x === "B")).toHaveLength(set.summary.B.points);
        // Cada tiempo muerto y cada cambio ocurre en un marcador por el que pasa el set
        const seen = visited(w);
        for (const side of ["A", "B"] as const) {
          const opp: Side = side === "A" ? "B" : "A";
          void opp;
          for (const t of set[side].timeouts) {
            const key = side === "A" ? `${t.score.own}:${t.score.opp}` : `${t.score.opp}:${t.score.own}`;
            expect(seen.has(key), `set ${set.number}, ${side}: tiempo muerto ${key}`).toBe(true);
          }
        }
      }
    }
  });

  it("un acta sin las rondas de saque legibles deja los sets sin marcador jugada a jugada, sin romper nada", () => {
    const data = read(a143401283);
    expect(data.sets).toHaveLength(5);
    expect(data.sets.every((s) => s.rallies === null)).toBe(true);
  });

  it("quien saca primero según las rondas es quien dice el acta (S)", () => {
    const data = read(a145743000);
    for (const set of data.sets) {
      if (!set.rallies) continue;
      const servesFirst = set.A.startsServing ? "A" : set.B.startsServing ? "B" : null;
      expect(servesFirst).toBe(set.rallies.first);
    }
  });

  it("el set 5 recoge el panel gemelo de la derecha, donde el equipo de la izquierda sigue anotando", () => {
    const data = read(a145743000);
    const five = data.sets.find((s) => s.number === 5)!;
    const ends = [five.service.A?.ends, five.service.B?.ends].filter(Boolean).flat();
    expect(Math.max(...(ends as number[]))).toBeGreaterThanOrEqual(Math.max(five.summary.A.points, five.summary.B.points));
  });
});
