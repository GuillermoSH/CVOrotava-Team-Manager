import { describe, expect, it } from "vitest";
import { buildCompetition, type CompetitionInput } from "./build";
import { describeHighlight, positionsByRound, roundDigest, standingsAfterRound } from "./digest";

type M = CompetitionInput["matches"][number];

let id = 1;
function played(
  group: number,
  round: number,
  home: number,
  away: number,
  sets: [number, number],
  pts: [number, number][]
): M {
  return {
    id: id++,
    group_id: group,
    round_id: round,
    home_team_id: home,
    away_team_id: away,
    facility_name: null,
    local_date: `2026-10-${String(round).padStart(2, "0")}`,
    local_time: "16:00:00",
    finished: true,
    canceled: false,
    postponed: false,
    rest: false,
    home_sets: sets[0],
    away_sets: sets[1],
    home_league_points: null,
    away_league_points: null,
    report_url: null,
    sets: pts.map(([h, a], i) => ({ set_number: i + 1, home_points: h, away_points: a })),
  };
}

const input: CompetitionInput = {
  season: "2026-27",
  gender: "male",
  groups: [{ id: 1, name: "GRUPO TENERIFE", type: "league", sort_order: 1 }],
  rounds: [
    { id: 11, group_id: 1, name: "1", sort_order: 1 },
    { id: 12, group_id: 1, name: "2", sort_order: 2 },
    { id: 13, group_id: 1, name: "3", sort_order: 3 },
  ],
  teams: [
    { id: 1, name: "CV Orotava", club_id: 1, is_our_club: true },
    { id: 2, name: "CV Dos", club_id: 2, is_our_club: false },
    { id: 3, name: "CV Tres", club_id: 3, is_our_club: false },
    { id: 4, name: "CV Cuatro", club_id: 4, is_our_club: false },
  ],
  matches: [
    // J1: 1 arrasa a 4 (3-0, +40 puntos); 3 gana a 2 por 3-1 → 1.º y 3.º con 3 puntos, 2.º y 4.º sin ninguno
    played(1, 11, 1, 4, [3, 0], [[25, 10], [25, 12], [25, 13]]),
    played(1, 11, 3, 2, [3, 1], [[25, 20], [20, 25], [25, 22], [25, 21]]),
    // J2: 4 (último) gana a 1 (líder) por 3-0: sorpresa; 2 gana a 3 por 3-2 muy justo
    played(1, 12, 4, 1, [3, 0], [[25, 23], [25, 22], [25, 23]]),
    played(1, 12, 2, 3, [3, 2], [[25, 23], [22, 25], [25, 22], [23, 25], [15, 13]]),
    // J3 sin jugar
  ],
};

const comp = buildCompetition(input, "2026-10-30");
const group = comp.groups[0];
const name = (teamId: number) => comp.teams[teamId].name;

describe("standingsAfterRound", () => {
  it("la primera jornada no tiene movimiento con el que comparar", () => {
    const rows = standingsAfterRound(group, 0);
    expect(rows[0].teamId).toBe(1);
    expect(rows.every((r) => r.movement === null)).toBe(true);
  });

  it("la segunda compara con la primera: lo que sube es positivo y lo que baja, negativo", () => {
    const j1 = standingsAfterRound(group, 0);
    const j2 = standingsAfterRound(group, 1);
    for (const r of j2) {
      const prev = j1.find((x) => x.teamId === r.teamId)!;
      expect(r.movement).toBe(prev.position - r.position);
    }
    // Cuatro ganó y estaba último: sube
    expect(j2.find((r) => r.teamId === 4)!.movement).toBeGreaterThan(0);
  });

  it("una jornada sin jugar deja la tabla como estaba", () => {
    const j2 = standingsAfterRound(group, 1);
    const j3 = standingsAfterRound(group, 2);
    expect(j3.map((r) => r.teamId)).toEqual(j2.map((r) => r.teamId));
    expect(j3.every((r) => r.movement === 0 || r.movement === null)).toBe(true);
  });
});

describe("positionsByRound", () => {
  it("solo las jornadas con partidos jugados, con el puesto de cada equipo", () => {
    const race = positionsByRound(group);
    expect(race.map((r) => r.round)).toEqual([1, 2]);
    expect(Object.keys(race[0].positions)).toHaveLength(4);
    expect(race[0].positions[1]).toBe(1);
  });
});

describe("roundDigest", () => {
  it("la primera jornada: líder y victoria contundente, sin sorpresas todavía", () => {
    const kinds = roundDigest(group, 0).map((h) => h.kind);
    expect(kinds[0]).toBe("leader");
    expect(kinds).toContain("biggest");
    expect(kinds).not.toContain("upset");
  });

  it("la segunda: sorpresa, partido más igualado y cambio de líder", () => {
    const digest = roundDigest(group, 1);
    const upset = digest.find((h) => h.kind === "upset");
    expect(upset).toMatchObject({ kind: "upset", winnerId: 4, loserId: 1 });
    const closest = digest.find((h) => h.kind === "closest");
    expect(closest).toMatchObject({ kind: "closest", winnerId: 2, loserId: 3, score: "3-2", pointDiff: 2 });
  });

  it("una jornada sin partidos jugados no destaca nada", () => {
    expect(roundDigest(group, 2)).toEqual([]);
  });

  it("no pasa de cinco hechos", () => {
    expect(roundDigest(group, 1).length).toBeLessThanOrEqual(5);
  });
});

describe("incomparecencias", () => {
  const walkoverInput: CompetitionInput = {
    ...input,
    matches: [
      played(1, 11, 1, 4, [3, 0], [[25, 10], [25, 12], [25, 13]]),
      played(1, 11, 3, 2, [3, 1], [[25, 20], [20, 25], [25, 22], [25, 21]]),
      // 4 (último) gana 3-0 al líder pero con el líder a cero: incomparecencia, no sorpresa
      played(1, 12, 4, 1, [3, 0], [[25, 0], [25, 0], [25, 0]]),
    ],
  };
  const g = buildCompetition(walkoverInput, "2026-10-30").groups[0];

  it("se señalan como tales y no cuentan como sorpresa ni como victoria contundente", () => {
    const kinds = roundDigest(g, 1).map((h) => h.kind);
    expect(kinds).toContain("walkover");
    expect(kinds).not.toContain("upset");
    expect(kinds).not.toContain("biggest");
  });
});

describe("describeHighlight", () => {
  it("escribe cada hecho en castellano con los nombres que le pasan", () => {
    expect(describeHighlight({ kind: "leader", teamId: 1, points: 3, change: "first" }, name)).toBe("CV Orotava lidera la clasificación, con 3 puntos.");
    expect(describeHighlight({ kind: "leader", teamId: 1, points: 6, change: "new" }, name)).toBe("CV Orotava es el nuevo líder, con 6 puntos.");
    expect(describeHighlight({ kind: "leader", teamId: 1, points: 6, change: "same" }, name)).toBe("CV Orotava sigue líder, con 6 puntos.");
    expect(describeHighlight({ kind: "upset", winnerId: 4, loserId: 1, winnerPos: 4, loserPos: 1, score: "3-0" }, name)).toBe(
      "Sorpresa: CV Cuatro (4.º) gana 3-0 a CV Orotava (1.º)."
    );
    expect(describeHighlight({ kind: "closest", winnerId: 2, loserId: 3, score: "3-2", pointDiff: 1 }, name)).toBe(
      "Partido más igualado: CV Dos gana 3-2 a CV Tres, decidido por 1 punto en total."
    );
    expect(describeHighlight({ kind: "closest", winnerId: 2, loserId: 3, score: "3-2", pointDiff: null }, name)).toContain("en cinco sets");
    expect(describeHighlight({ kind: "walkover", winnerId: 4, loserId: 1 }, name)).toContain("incomparecencia");
    expect(describeHighlight({ kind: "climber", teamId: 4, places: 1 }, name)).toBe("CV Cuatro sube 1 puesto.");
    expect(describeHighlight({ kind: "faller", teamId: 1, places: 3 }, name)).toBe("CV Orotava baja 3 puestos.");
    expect(describeHighlight({ kind: "biggest", winnerId: 1, loserId: 2, score: "3-0", pointDiff: 40 }, name)).toContain("40 puntos de diferencia");
  });
});
