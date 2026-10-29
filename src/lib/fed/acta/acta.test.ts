import { describe, expect, it } from "vitest";
import { normalizeTeam, parseActa } from "./parse";
import { actaStatus, compareWithFed, validateActa, type FedMatchForActa } from "./validate";
import type { ActaData, ActaItem } from "./types";
import { ACTA_PARSER_VERSION } from "./types";
import a145743000 from "./__fixtures__/145743000.json";
import a143401275 from "./__fixtures__/143401275.json";
import a143401278 from "./__fixtures__/143401278.json";
import a143401283 from "./__fixtures__/143401283.json";
import a143401289 from "./__fixtures__/143401289.json";
import a143401292 from "./__fixtures__/143401292.json";
import a143401337 from "./__fixtures__/143401337.json";
import a143401402 from "./__fixtures__/143401402.json";
import a144272961 from "./__fixtures__/144272961.json";

/**
 * Actas reales (los textos con su posición, tal como los devuelve pdf.js), elegidas por lo que
 * enseñan: un partido de cinco sets, uno de tres con las filas vacías, sanciones, comentarios, y las
 * irregularidades que existen de verdad (sin plantilla, set otorgado, sin paneles).
 */
const items = (raw: unknown): ActaItem[] => (raw as [string, number, number][]).map(([s, x, y]) => ({ s, x, y }));

function read(raw: unknown) {
  const parsed = parseActa(items(raw));
  expect(parsed.data, "el acta se lee").not.toBeNull();
  const data = parsed.data as ActaData;
  const issues = [...parsed.issues, ...validateActa(data)];
  return { data, issues, codes: issues.map((i) => i.code), status: actaStatus(issues) };
}

describe("acta de cinco sets (2026/27, Grupo Las Palmas)", () => {
  const { data, issues, status } = read(a145743000);

  it("cuadra por completo: ninguna comprobación salta", () => {
    expect(issues).toEqual([]);
    expect(status).toBe("ok");
  });

  it("cabecera del partido", () => {
    expect(data.parserVersion).toBe(ACTA_PARSER_VERSION);
    expect(data.competition).toBe("Liga Canaria Sénior Masculina 2026/27 (2ª Div. Masculina)");
    expect(data.group).toBe("GRUPO LAS PALMAS");
    expect(data.round).toBe("1");
    expect(data.date).toBe("2026-10-25");
    expect(data.time).toBe("17:00");
    expect(data.venue).toBe("Pab. Mpal. El Batán");
    expect(data.city).toBe("Las Palmas de Gran Canaria");
  });

  it("los equipos se identifican por su nombre, aunque las letras de las rejillas cambien de set", () => {
    expect(data.teams).toEqual({ A: "DOS 19 ARINAGA", B: "CV SAN ROQUE" });
    // En el set 1 la rejilla de la izquierda es A; en el 2 es B: la alineación de cada equipo sigue siendo suya
    const [s1, s2] = data.sets;
    expect(s1.A.lineup).toEqual([18, 17, 6, 27, 44, 23]);
    expect(s1.B.lineup).toEqual([7, 2, 24, 95, 99, 4]);
    expect(s2.A.lineup).toEqual([18, 17, 6, 27, 44, 23]);
    expect(s2.B.lineup).toEqual([4, 7, 2, 24, 95, 99]);
  });

  it("puntos, horas y duración de cada set", () => {
    expect(data.sets.map((s) => [s.number, s.summary.A.points, s.summary.B.points, s.start, s.end, s.durationMin])).toEqual([
      [1, 25, 22, "16:48", "17:14", 26],
      [2, 25, 20, "17:16", "17:40", 23],
      [3, 22, 25, "17:44", "18:12", 28],
      [4, 22, 25, "18:15", "18:45", 30],
      [5, 16, 18, "18:49", "19:13", 24],
    ]);
  });

  it("tiempos muertos y sustituciones con el marcador en que se pidieron", () => {
    const s1 = data.sets[0];
    expect(s1.A.timeouts).toEqual([]);
    expect(s1.B.timeouts).toEqual([{ score: { own: 21, opp: 23 } }, { score: { own: 21, opp: 24 } }]);
    expect(s1.A.substitutions).toEqual([
      { position: 1, playerIn: 13, scoreIn: { own: 13, opp: 12 }, scoreBack: { own: 19, opp: 20 } },
      { position: 4, playerIn: 9, scoreIn: { own: 13, opp: 12 }, scoreBack: { own: 19, opp: 20 } },
    ]);
    // Cada sustitución cuenta al entrar y otra vez si el titular vuelve: 2 + 2 = 4 en el resultado
    expect(s1.summary.A.substitutions).toBe(4);
  });

  it("totales y ganador", () => {
    expect(data.totals).toEqual({
      A: { timeouts: 5, substitutions: 15, setsWon: 2, points: 110 },
      B: { timeouts: 7, substitutions: 10, setsWon: 3, points: 110 },
      start: "16:48",
      end: "19:34",
      durationMin: 166,
    });
    expect(data.winner).toEqual({ team: "CV SAN ROQUE", setsWinner: 3, setsLoser: 2 });
  });

  it("plantillas con líberos, cuerpo técnico, árbitros y sanción", () => {
    expect(data.roster.A).toHaveLength(13);
    expect(data.roster.B).toHaveLength(12);
    expect(data.roster.A.filter((p) => p.libero)).toHaveLength(2);
    expect(data.roster.B.find((p) => p.number === 1)).toMatchObject({ name: "STANEK MIKOLAJ", libero: true });
    // Los nombres largos que se parten en dos líneas se unen
    expect(data.roster.B.find((p) => p.number === 7)?.name).toBe("ZANELLO DARIO ALBERTO");
    expect(data.roster.B.find((p) => p.number === 99)?.name).toBe("DOMBROWE NOAH JON ECKHARD");
    expect(data.staff.A).toEqual([
      { role: "E", name: "LUCIA MOISES" },
      { role: "A1", name: "MENDEZ ADRIEL" },
    ]);
    expect(data.referees).toEqual([{ role: "1º", name: "SUAREZ OSCAR", license: "16229" }]);
    expect(data.sanctions).toEqual([{ kind: "W", offender: "E", team: "A", set: 5, score: { own: 9, opp: 9 } }]);
    expect(data.comments).toBeNull();
  });

  it("coincide con los puntos de la federación, con el local A", () => {
    const fed: FedMatchForActa = {
      homeName: "DOS 19 ARINAGA",
      awayName: "CV SAN ROQUE",
      homeSets: 2,
      awaySets: 3,
      sets: [
        { home: 25, away: 22 },
        { home: 25, away: 20 },
        { home: 22, away: 25 },
        { home: 22, away: 25 },
        { home: 16, away: 18 },
      ],
    };
    const cmp = compareWithFed(data, fed);
    expect(cmp.issues).toEqual([]);
    expect(cmp.homeSide).toBe("A");
    // Si el nombre no coincide (abreviaturas), deciden los puntos de cada set
    expect(compareWithFed(data, { ...fed, homeName: "Arinaga", awayName: "San Roque" }).homeSide).toBe("A");
    // Con el local y el visitante al revés, el local es B
    const swapped: FedMatchForActa = { ...fed, homeName: "CV SAN ROQUE", awayName: "DOS 19 ARINAGA", homeSets: 3, awaySets: 2, sets: fed.sets.map((s) => ({ home: s.away, away: s.home })) };
    expect(compareWithFed(data, swapped).homeSide).toBe("B");
  });

  it("detecta un acta que no es de este partido", () => {
    const other: FedMatchForActa = { homeName: "X", awayName: "Y", homeSets: 3, awaySets: 0, sets: [{ home: 25, away: 10 }, { home: 25, away: 10 }, { home: 25, away: 10 }] };
    const cmp = compareWithFed(data, other);
    expect(cmp.homeSide).toBeNull();
    expect(cmp.issues.map((i) => i.code)).toContain("fed-mismatch");
  });

  it("detecta un punto de un set que no cuadra con la federación", () => {
    const fed: FedMatchForActa = {
      homeName: "DOS 19 ARINAGA",
      awayName: "CV SAN ROQUE",
      homeSets: 2,
      awaySets: 3,
      sets: [{ home: 25, away: 22 }, { home: 25, away: 20 }, { home: 22, away: 25 }, { home: 22, away: 25 }, { home: 16, away: 17 }],
    };
    expect(compareWithFed(data, fed).issues.map((i) => i.code)).toContain("fed-set-points");
  });
});

describe("acta de tres sets: las filas sin jugar del resultado no cuentan", () => {
  const { data, status } = read(a143401275);

  it("solo tiene los tres sets jugados", () => {
    expect(status).toBe("ok");
    expect(data.sets.map((s) => [s.summary.A.points, s.summary.B.points])).toEqual([
      [16, 25],
      [20, 25],
      [15, 25],
    ]);
    expect(data.totals.A.setsWon).toBe(0);
    expect(data.totals.B.setsWon).toBe(3);
    expect(data.winner?.team).toBe("DOS19 ARINAGA");
  });
});

describe("comentarios y sanciones", () => {
  it("el comentario de varias líneas se une", () => {
    const { data, status } = read(a143401278);
    expect(status).toBe("ok");
    expect(data.comments).toContain("SE ADJUNTA NC9");
    expect(data.comments).toContain("JUGADOR NÚMERO 17");
    expect(data.referees.map((r) => r.name)).toEqual(["MENDOZA HERMINIO", "CABRERA OLIVER"]);
  });

  it("una sanción al cuerpo técnico lleva su letra y una al jugador, su dorsal; el comentario va aparte", () => {
    const { data } = read(a143401292);
    expect(data.sanctions).toEqual([{ kind: "W", offender: "D", team: "A", set: 2, score: { own: 13, opp: 16 } }]);
    expect(data.comments).toBe("El equipo local no presenta entrenador, solo delegado");
  });

  it("amonestación y penalización seguidas al mismo jugador salen como dos sanciones", () => {
    const { data } = read(a143401337);
    expect(data.sanctions.map((s) => [s.kind, s.offender, s.team, s.set])).toEqual([
      ["W", "15", "A", 3],
      ["P", "15", "A", 3],
    ]);
  });
});

describe("actas con irregularidades reales: se leen, pero quedan para revisar", () => {
  it("sin plantilla ni alineaciones escritas: los sets y los marcadores de cambios se leen igual", () => {
    const { data, status, codes } = read(a143401289);
    expect(status).toBe("review");
    expect(data.roster).toEqual({ A: [], B: [] });
    expect(data.sets[0].A.lineup).toEqual([]);
    expect(codes).toContain("lineup-missing");
    expect(codes).toContain("roster-empty");
    // El marcador de la sustitución está aunque no esté el dorsal del que entra
    expect(data.sets[1].B.substitutions.every((s) => s.playerIn === null)).toBe(true);
    expect(data.sets[1].B.substitutions.length).toBeGreaterThan(0);
  });

  it("un set otorgado por el comité (25-0 con jugadas en el panel) no se contrasta con el panel", () => {
    const { data, status, codes } = read(a143401402);
    expect(status).toBe("review");
    expect(data.sets.map((s) => [s.summary.A.points, s.summary.B.points])).toEqual([[25, 0], [25, 0], [25, 0]]);
    expect(codes).toContain("set-awarded");
    expect(codes).not.toContain("score-range");
    expect(data.comments).toContain("ALINEACIÓN INCOMPLETA");
  });

  it("un acta con el resultado rellenado a posteriori, sin paneles: los sets se guardan con sus puntos", () => {
    const { data, status, codes } = read(a143401283);
    expect(status).toBe("review");
    expect(data.sets.map((s) => [s.summary.A.points, s.summary.B.points])).toEqual([[25, 27], [25, 17], [25, 21], [28, 30], [11, 15]]);
    expect(data.sets.every((s) => s.start === null && s.A.lineup.length === 0)).toBe(true);
    expect(codes).toContain("no-panels");
    expect(codes).toContain("no-winner");
  });

  it("con los mismos puntos de cada set pero otro resultado en la federación avisa, no falla", () => {
    const { data } = read(a144272961);
    const fed: FedMatchForActa = {
      homeName: "CD TAKNARA",
      awayName: "BENTAGUAIRE PUERTO DEL ROSARIO",
      homeSets: 3,
      awaySets: 1,
      sets: [{ home: 0, away: 27 }, { home: 0, away: 29 }, { home: 25, away: 19 }, { home: 25, away: 18 }],
    };
    const cmp = compareWithFed(data, fed);
    expect(cmp.homeSide).toBe("B");
    expect(cmp.issues.map((i) => [i.level, i.code])).toEqual([
      ["warning", "fed-sets-won"],
      ["warning", "fed-sets-won"],
    ]);
  });
});

describe("entradas que no son un acta", () => {
  it("una página vacía devuelve error y ningún dato", () => {
    const r = parseActa([]);
    expect(r.data).toBeNull();
    expect(actaStatus(r.issues)).toBe("failed");
  });

  it("un texto cualquiera tampoco da datos", () => {
    const r = parseActa([{ s: "Hola", x: 10, y: 10 }]);
    expect(r.data).toBeNull();
  });
});

describe("normalizeTeam", () => {
  it("ignora tildes, mayúsculas y signos", () => {
    expect(normalizeTeam("CV Gáldar-Pavón")).toBe("cv galdar pavon");
    expect(normalizeTeam("  DOS 19   ARINAGA ")).toBe("dos 19 arinaga");
  });
});

describe("actaStatus", () => {
  it("ok sin avisos, review con avisos y failed con algún error", () => {
    expect(actaStatus([])).toBe("ok");
    expect(actaStatus([{ level: "warning", code: "x", message: "" }])).toBe("review");
    expect(actaStatus([{ level: "warning", code: "x", message: "" }, { level: "error", code: "y", message: "" }])).toBe("failed");
  });
});
