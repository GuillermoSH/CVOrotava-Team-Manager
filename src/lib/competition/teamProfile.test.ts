import { describe, expect, it } from "vitest";
import type { CompetitionMatch } from "./build";
import type { MatchReport, ReportSet, ReportSetSide } from "./report";
import { buildTeamProfile, SMALL_SAMPLE, type ProfileMatch } from "./teamProfile";

const T = 10; // nuestro equipo en las pruebas
const R = 20; // el rival

const side = (o: Partial<ReportSetSide> = {}): ReportSetSide => ({
  timeoutsCount: 0,
  subsCount: 0,
  lineup: [],
  startsServing: null,
  timeouts: [],
  substitutions: [],
  ...o,
});

const set = (number: number, home: number, away: number, h: Partial<ReportSetSide> = {}, a: Partial<ReportSetSide> = {}, durationMin = 25): ReportSet => ({
  number,
  start: null,
  end: null,
  durationMin,
  home: { points: home, ...side(h) },
  away: { points: away, ...side(a) },
});

const match = (id: number, homeId: number, awayId: number, sets: [number, number][]): CompetitionMatch => {
  const hs = sets.filter(([h, a]) => h > a).length;
  return {
    id,
    homeId,
    awayId,
    date: "2026-10-01",
    time: null,
    venue: null,
    status: "played",
    homeSets: hs,
    awaySets: sets.length - hs,
    sets: sets.map(([home, away]) => ({ home, away })),
    reportUrl: null,
    ours: false,
  };
};

const report = (sets: ReportSet[], extra: Partial<MatchReport> = {}): MatchReport => ({
  status: "ok",
  issues: [],
  start: null,
  end: null,
  durationMin: null,
  venue: null,
  city: null,
  comments: null,
  totals: { home: { timeouts: null, subs: null }, away: { timeouts: null, subs: null } },
  sets,
  players: {
    home: [1, 2, 3, 4, 5, 6, 7].map((n) => ({ number: n, name: `LOCAL ${n}`, libero: n === 7 })),
    away: [1, 2, 3, 4, 5, 6, 7].map((n) => ({ number: n, name: `VISIT ${n}`, libero: n === 7 })),
  },
  staff: { home: [{ role: "E", name: "ENTRENADOR LOCAL" }], away: [] },
  referees: [],
  sanctions: [],
  ...extra,
});

describe("buildTeamProfile: resultados", () => {
  // Como local: 3-0 (25-20, 25-22, 25-23); como visitante: pierde 2-3 (25-23 gana el 1.º, pierde el resto, 15-13 el 5.º lo pierde)
  const m1 = match(1, T, R, [[25, 20], [25, 22], [25, 23]]);
  const m2 = match(2, R, T, [[23, 25], [25, 20], [25, 20], [20, 25], [15, 13]]);
  const p = buildTeamProfile(T, [
    { match: m1, report: null },
    { match: m2, report: null },
    { match: { ...match(3, T, 30, [[25, 10]]), status: "scheduled" }, report: null },
    { match: match(4, 40, 50, [[25, 10]]), report: null },
  ]);

  it("solo cuenta los partidos jugados de ese equipo", () => {
    expect(p.played).toBe(2);
    expect(p.withReport).toBe(0);
  });

  it("victorias, derrotas y sets desde su lado, sea local o visitante", () => {
    expect(p.record).toEqual({ won: 1, lost: 1, setsFor: 5, setsAgainst: 3, wins30: 1, wins32: 0, losses03: 0, losses23: 1 });
  });

  it("sets: primer set, apretados, quinto y puntos medios", () => {
    expect(p.sets.played).toBe(8);
    expect(p.sets.won).toBe(5);
    expect(p.sets.firstSet).toEqual({ n: 2, of: 2 });
    // Apretados (≤2): 25-23 en casa (gana), 23-25 como visitante (gana) y 15-13 en el quinto (pierde)
    expect(p.sets.tight).toEqual({ n: 2, of: 3 });
    expect(p.sets.decider).toEqual({ n: 0, of: 1 });
    expect(p.sets.avgFor).toBeCloseTo((25 + 25 + 25 + 25 + 20 + 20 + 25 + 13) / 8);
  });

  it("sin actas no inventa nada del detalle", () => {
    expect(p.smallSample).toBe(true);
    expect(p.timeouts.total).toBe(0);
    expect(p.timeouts.perSet).toBeNull();
    expect(p.lineups.sets).toBe(0);
    expect(p.lineups.sextets).toEqual([]);
    expect(p.players).toEqual([]);
  });
});

describe("buildTeamProfile: detalle de las actas", () => {
  const home = (o: Partial<ReportSetSide>) => o;
  // Partido 1: T local. Set 1: 3 tiempos muertos de T y 1 del rival; cambios y alineación.
  const s1 = set(
    1,
    25,
    20,
    home({
      lineup: [4, 5, 6, 1, 2, 3],
      startsServing: true,
      timeouts: [
        { own: 5, opp: 8 }, // perdiendo por 3, fase inicial
        { own: 14, opp: 14 }, // empatado, fase media
        { own: 21, opp: 17 }, // ganando por 4, fase final
      ],
      substitutions: [{ position: 2, playerIn: 7, scoreIn: { own: 10, opp: 12 }, scoreBack: { own: 18, opp: 15 } }],
    }),
    { timeouts: [{ own: 9, opp: 6 }], lineup: [1, 2, 3, 4, 5, 6] }
  );
  // Set 2: misma alineación pero girada (rotación distinta del mismo sexteto) y otro sexteto en el set 3
  const s2 = set(2, 25, 22, home({ lineup: [1, 2, 3, 4, 5, 6], startsServing: false, timeouts: [{ own: 12, opp: 13 }] }), { timeouts: [{ own: 13, opp: 12 }] });
  const s3 = set(3, 25, 23, home({ lineup: [4, 5, 6, 1, 2, 7] }), {}, 30);
  const m = match(1, T, R, [[25, 20], [25, 22], [25, 23]]);
  const rep = report([s1, s2, s3], { sanctions: [{ kind: "W", offender: "E", side: "home", set: 2, score: { own: 5, opp: 5 } }, { kind: "P", offender: "3", side: "away", set: 1, score: null }] });
  const p = buildTeamProfile(T, [{ match: m, report: rep }]);

  it("tiempos muertos: cuántos, con qué marcador y en qué fase del set", () => {
    expect(p.timeouts.total).toBe(4);
    expect(p.timeouts.sets).toBe(3);
    expect(p.timeouts.perSet).toBeCloseTo(4 / 3);
    expect(p.timeouts.avgLead).toBeCloseTo((-3 + 0 + 4 + -1) / 4);
    expect(p.timeouts.trailing3).toEqual({ n: 1, of: 4 });
    expect(p.timeouts.leading3).toEqual({ n: 1, of: 4 });
    expect(p.timeouts.phase).toEqual({ early: 1, mid: 2, late: 1 });
  });

  it("quién pide el primero del set: el de menor marcador total", () => {
    // Set 1: T a 13 puntos totales, rival a 15 → T primero. Set 2: T a 25, rival a 25 → no es estrictamente antes: cuenta como no.
    expect(p.timeouts.first).toEqual({ n: 1, of: 2 });
  });

  it("cambios: posición, fase, vuelta del titular y quién entra con su nombre", () => {
    expect(p.substitutions.total).toBe(1);
    expect(p.substitutions.byPosition).toEqual([0, 1, 0, 0, 0, 0]);
    expect(p.substitutions.phase).toEqual({ early: 0, mid: 1, late: 0 });
    expect(p.substitutions.returned).toEqual({ n: 1, of: 1 });
    expect(p.substitutions.topIn).toEqual([{ name: "LOCAL 7", times: 1 }]);
  });

  it("alineaciones: el mismo sexteto con otra rotación son sets distintos, pero un solo sexteto", () => {
    expect(p.lineups.sets).toBe(3);
    // [4,5,6,1,2,3] y [1,2,3,4,5,6] giran al mismo orden (1,2,3,4,5,6): dos sets; el [4,5,6,1,2,7] es otro
    expect(p.lineups.sextets[0]).toMatchObject({ numbers: [1, 2, 3, 4, 5, 6], count: 2 });
    expect(p.lineups.sextets[0].share).toBeCloseTo(2 / 3);
    expect(p.lineups.sextets[0].names[0]).toBe("LOCAL 1");
    expect(p.lineups.distinctSextets).toBe(2);
    expect(p.lineups.startsServing).toEqual({ n: 1, of: 2 });
  });

  it("plantilla: titulares, entradas desde el banquillo y entrenador", () => {
    const l7 = p.players.find((x) => x.name === "LOCAL 7")!;
    expect(l7).toMatchObject({ number: 7, libero: true, starts: 1, subIns: 1, matches: 1 });
    expect(p.players[0].name).toBe("LOCAL 1");
    expect(p.players[0].starts).toBe(3);
    expect(p.coaches).toEqual(["ENTRENADOR LOCAL"]);
  });

  it("sanciones: solo las de este equipo", () => {
    expect(p.sanctions).toEqual({ W: 1, P: 0, E: 0, D: 0 });
  });

  it("la duración media de los sets sale de las actas", () => {
    expect(p.sets.avgDurationMin).toBeCloseTo((25 + 25 + 30) / 3);
  });

  it("con pocas actas avisa de la muestra; con suficientes, no", () => {
    expect(p.smallSample).toBe(true);
    const many: ProfileMatch[] = Array.from({ length: SMALL_SAMPLE }, (_, i) => ({ match: { ...m, id: 100 + i }, report: rep }));
    expect(buildTeamProfile(T, many).smallSample).toBe(false);
  });

  it("como visitante lee su lado del acta, no el del local", () => {
    const away = match(9, R, T, [[20, 25]]);
    const r = report([set(1, 20, 25, {}, { timeouts: [{ own: 3, opp: 9 }], lineup: [1, 2, 3, 4, 5, 6] })]);
    const q = buildTeamProfile(T, [{ match: away, report: r }]);
    expect(q.timeouts.total).toBe(1);
    expect(q.timeouts.trailing3).toEqual({ n: 1, of: 1 });
    expect(q.players.find((x) => x.name === "VISIT 1")?.starts).toBe(1);
    expect(q.players.find((x) => x.name === "LOCAL 1")).toBeUndefined();
  });

  it("un jugador escrito de otra forma en otra acta (nombre y apellido al revés) no sale duplicado", () => {
    const a = report([set(1, 25, 20, { lineup: [1, 2, 3, 4, 5, 6] })]);
    const b = report([set(1, 25, 20, { lineup: [1, 2, 3, 4, 5, 6] })], {
      players: { home: [1, 2, 3, 4, 5, 6, 7].map((n) => ({ number: n, name: n === 1 ? "1 LOCAL" : `LOCAL ${n}`, libero: n === 7 })), away: [] },
    });
    const p = buildTeamProfile(T, [
      { match: match(1, T, R, [[25, 20]]), report: a },
      { match: match(2, T, R, [[25, 20]]), report: a },
      { match: match(3, T, R, [[25, 20]]), report: b },
    ]);
    const ones = p.players.filter((x) => x.name.includes("LOCAL") && x.number === 1);
    expect(ones).toHaveLength(1);
    expect(ones[0]).toMatchObject({ name: "LOCAL 1", matches: 3, starts: 3 });
  });
});
