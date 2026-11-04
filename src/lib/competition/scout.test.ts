import { describe, expect, it } from "vitest";
import type { CompetitionMatch } from "./build";
import {
  commonOpponents,
  headToHead,
  isCloseSet,
  matchesKnownBefore,
  outcomesOf,
  scoutMatch,
  scoutTeam,
} from "./scout";

let nextId = 1;
/** Partido jugado: marcador en sets y, opcionalmente, puntos de cada set (local-visitante). */
function played(
  home: number,
  away: number,
  score: [number, number],
  date: string,
  sets: [number, number][] = []
): CompetitionMatch {
  return {
    id: nextId++,
    homeId: home,
    awayId: away,
    date,
    time: null,
    venue: null,
    status: "played",
    homeSets: score[0],
    awaySets: score[1],
    sets: sets.map(([h, a]) => ({ home: h, away: a })),
    reportUrl: null,
    ours: false,
  };
}

const scheduled = (home: number, away: number, date: string): CompetitionMatch => ({
  ...played(home, away, [0, 0], date),
  status: "scheduled",
  homeSets: null,
  awaySets: null,
});

// Equipos: 1 y 2 son los que se comparan; 3 y 4 son rivales comunes.
const league: CompetitionMatch[] = [
  // Equipo 1: gana 3-0 a 3 (dominante), gana 3-1 a 4, pierde 2-3 con 2
  played(1, 3, [3, 0], "2026-10-03", [[25, 15], [25, 16], [25, 14]]),
  played(4, 1, [1, 3], "2026-10-10", [[20, 25], [25, 23], [18, 25], [22, 25]]),
  played(1, 2, [2, 3], "2026-10-17", [[25, 23], [20, 25], [25, 22], [18, 25], [13, 15]]),
  // Equipo 2: gana a 3 por la mínima y pierde con 4
  played(2, 3, [3, 2], "2026-10-04", [[25, 23], [20, 25], [25, 22], [19, 25], [15, 13]]),
  played(4, 2, [3, 0], "2026-10-11", [[25, 18], [25, 20], [25, 19]]),
  scheduled(1, 4, "2026-11-01"),
];

describe("outcomesOf", () => {
  it("devuelve solo los partidos jugados del equipo, vistos desde él y por fecha", () => {
    const o = outcomesOf(league, 1);
    expect(o.map((x) => [x.rivalId, x.home, x.ownSets, x.rivalSets, x.won])).toEqual([
      [3, true, 3, 0, true],
      [4, false, 3, 1, true],
      [2, true, 2, 3, false],
    ]);
    // Los puntos se dan desde el punto de vista del equipo (como visitante van girados)
    expect(o[1].sets[0]).toEqual({ own: 25, rival: 20 });
  });

  it("ignora los pendientes", () => {
    expect(outcomesOf([scheduled(1, 2, "2026-11-01")], 1)).toEqual([]);
  });
});

describe("isCloseSet", () => {
  it("2 puntos o menos es ajustado", () => {
    expect(isCloseSet({ own: 25, rival: 23 })).toBe(true);
    expect(isCloseSet({ own: 26, rival: 28 })).toBe(true);
    expect(isCloseSet({ own: 25, rival: 22 })).toBe(false);
  });
});

describe("scoutTeam", () => {
  const s = scoutTeam(league, 1);

  it("cuenta partidos, victorias y sets", () => {
    expect([s.played, s.won, s.lost]).toEqual([3, 2, 1]);
    expect([s.setsFor, s.setsAgainst]).toEqual([8, 4]);
  });

  it("reparte por marcador", () => {
    expect(s.results).toEqual({ w30: 1, w31: 1, w32: 0, l32: 1, l31: 0, l30: 0 });
  });

  it("separa casa y fuera", () => {
    expect(s.home).toEqual({ played: 2, won: 1 });
    expect(s.away).toEqual({ played: 1, won: 1 });
  });

  it("da la forma, del más reciente al más antiguo, y la racha", () => {
    expect(s.form.map((f) => f.score)).toEqual(["2-3", "3-1", "3-0"]);
    expect(s.streak).toEqual({ won: false, length: 1 });
    expect(scoutTeam(league.slice(0, 2), 1).streak).toEqual({ won: true, length: 2 });
  });

  it("calcula la diferencia media de puntos por set", () => {
    // 3-0: +10 +9 +11; 3-1 (visitante): +5 -2 +7 +3; 2-3: +2 -5 +3 -7 -2 → sets 12, suma 34
    expect(s.points?.sets).toBe(12);
    expect(s.pointDiffPerSet).toBeCloseTo(((10 + 9 + 11) + (5 - 2 + 7 + 3) + (2 - 5 + 3 - 7 - 2)) / 12, 5);
  });

  it("cuenta los sets ajustados y cómo acaba el partido según el primer set", () => {
    // Ajustados: el 23-25 del 3-1 (perdido) y el 25-23 (ganado) y el 13-15 (perdido) del 2-3
    expect(s.closeSets).toEqual({ played: 3, won: 1 });
    // Ganó el primer set en 3-0, 3-1 y 2-3 (25-23): ganó 2 de 3. Nunca lo perdió.
    expect(s.firstSet.wonFirst).toEqual({ played: 3, won: 2 });
    expect(s.firstSet.lostFirst).toEqual({ played: 0, won: 0 });
  });

  it("sin actas con puntos, los puntos salen null y no revienta", () => {
    const sin = scoutTeam([played(1, 2, [3, 1], "2026-10-01")], 1);
    expect(sin.points).toBeNull();
    expect(sin.pointDiffPerSet).toBeNull();
    expect(sin.firstSet.wonFirst.played).toBe(0);
  });

  it("un equipo sin partidos queda en blanco", () => {
    const vacio = scoutTeam(league, 99);
    expect(vacio).toMatchObject({ played: 0, won: 0, form: [], streak: null });
  });
});

describe("headToHead y rivales comunes", () => {
  it("duelo directo desde el punto de vista del primero", () => {
    const h = headToHead(league, 1, 2);
    expect([h.played, h.won, h.setsFor, h.setsAgainst]).toEqual([1, 0, 2, 3]);
    expect(headToHead(league, 2, 1).won).toBe(1);
    expect(headToHead(league, 1, 99).played).toBe(0);
  });

  it("rivales comunes: solo los que han jugado los dos, sin contar entre ellos", () => {
    const c = commonOpponents(league, 1, 2);
    expect(c.map((x) => x.rivalId).sort()).toEqual([3, 4]);
  });

  it("la ventaja es positiva si el primero lo hizo mejor contra ese rival", () => {
    const c3 = commonOpponents(league, 1, 2).find((x) => x.rivalId === 3)!;
    // Equipo 1 ganó 3-0 (+10 por set); equipo 2 ganó 3-2 pero perdiendo en puntos (-0,8)
    expect(c3.edge).toBeCloseTo(10.8, 5);
    const c4 = commonOpponents(league, 1, 2).find((x) => x.rivalId === 4)!;
    expect(c4.edge).toBeGreaterThan(0);
  });

  it("sin puntos usa la diferencia de sets", () => {
    const sinPuntos = [played(1, 3, [3, 0], "2026-10-01"), played(2, 3, [3, 2], "2026-10-02")];
    const [c] = commonOpponents(sinPuntos, 1, 2);
    expect(c.edge).toBe(3 - 1);
  });
});

describe("scoutMatch", () => {
  it("señala favorito cuando la diferencia de puntos por set es clara", () => {
    const m = scoutMatch(league, 1, 2);
    expect(m.ratingDiff).not.toBeNull();
    expect(m.favoured).toBe("home");
    expect(m.commonEdge).toBeGreaterThan(0);
    expect(m.headToHead.played).toBe(1);
  });

  it("avisa de poca muestra con menos de 3 partidos", () => {
    expect(scoutMatch(league, 1, 2).lowSample).toBe(false);
    expect(scoutMatch(league, 1, 99).lowSample).toBe(true);
    expect(scoutMatch(league.slice(0, 2), 1, 2).lowSample).toBe(true);
  });

  it("sin datos no inventa favorito", () => {
    const m = scoutMatch([], 1, 2);
    expect(m.favoured).toBeNull();
    expect(m.ratingDiff).toBeNull();
    expect(m.commonEdge).toBeNull();
    expect(m.common).toEqual([]);
  });

  it("con diferencia pequeña no hay favorito", () => {
    const parejos = [
      played(1, 3, [3, 0], "2026-10-01", [[25, 20], [25, 20], [25, 20]]),
      played(2, 3, [3, 0], "2026-10-02", [[25, 21], [25, 20], [25, 20]]),
    ];
    expect(scoutMatch(parejos, 1, 2).favoured).toBeNull();
  });
});

describe("matchesKnownBefore", () => {
  it("de un partido ya jugado solo cuenta lo anterior a su fecha", () => {
    const target = league[2]; // 2026-10-17
    const known = matchesKnownBefore(target, league);
    expect(known.every((m) => (m.date ?? "") < "2026-10-17")).toBe(true);
    expect(known).not.toContain(target);
  });

  it("de un partido pendiente cuenta todo", () => {
    const pending = league[league.length - 1];
    expect(matchesKnownBefore(pending, league)).toHaveLength(league.length);
  });
});
