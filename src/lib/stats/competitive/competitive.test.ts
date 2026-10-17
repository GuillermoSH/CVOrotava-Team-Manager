import { describe, expect, it } from "vitest";
import type { FedTournamentBundle } from "@/lib/fed/parse";
import fixture from "./__fixtures__/liga-masculina-2024-27.json";
import { buildAchievements, bestWinStreak, ourViewsOf } from "./achievements";
import { buildCompetitiveStats } from "./build";
import { ELO_DEFAULT, runElo, scoreFromSets, seedRatings, winProbability } from "./elo";
import { seasonDataFromBundles } from "./fromBundles";
import { computeMetrics, percentile, toRating99 } from "./metrics";
import { starsFor } from "./rivals";
import { isPlayed, type CompMatch } from "./types";

let id = 0;
const match = (
  date: string,
  homeId: number,
  awayId: number,
  homeSets: number,
  awaySets: number,
  sets: [number, number][] = [],
  extra: Partial<CompMatch> = {}
): CompMatch => ({
  id: ++id,
  groupId: 1,
  roundIndex: null,
  roundLabel: null,
  date,
  homeId,
  awayId,
  finished: true,
  homeSets,
  awaySets,
  sets: sets.map(([home, away]) => ({ home, away })),
  ...extra,
});

describe("elo", () => {
  it("el resultado reparte puntos de suma cero y premia al ganador", () => {
    const run = runElo([match("2026-01-01", 1, 2, 3, 0)], new Map([[1, 1500], [2, 1500]]), ELO_DEFAULT);
    expect(run.final.get(1)! - 1500).toBeCloseTo(1500 - run.final.get(2)!, 9);
    expect(run.final.get(1)!).toBeGreaterThan(1500);
  });

  it("una victoria 3-0 mueve más que un 3-2", () => {
    const seeds = new Map([[1, 1500], [2, 1500]]);
    const sweep = runElo([match("2026-01-01", 1, 2, 3, 0)], seeds).final.get(1)!;
    const tight = runElo([match("2026-01-01", 1, 2, 3, 2)], seeds).final.get(1)!;
    expect(sweep).toBeGreaterThan(tight);
    expect(scoreFromSets(3, 0)).toBe(1);
    expect(scoreFromSets(0, 3)).toBe(0);
    expect(scoreFromSets(3, 2)).toBeCloseTo(0.667, 2);
  });

  it("ignora partidos sin jugar", () => {
    const pending = match("2026-01-01", 1, 2, 0, 0, [], { finished: false, homeSets: null, awaySets: null });
    expect(isPlayed(pending)).toBe(false);
    expect(runElo([pending], new Map([[1, 1500], [2, 1500]])).total).toBe(0);
  });

  it("la probabilidad es simétrica, acotada y sube con el rating", () => {
    const p = winProbability(1600, 1500, null);
    expect(p + winProbability(1500, 1600, null)).toBeCloseTo(1, 6);
    expect(p).toBeGreaterThan(0.5);
    expect(winProbability(2400, 1000, null)).toBeLessThanOrEqual(0.97);
    expect(winProbability(1000, 2400, null)).toBeGreaterThanOrEqual(0.03);
    expect(winProbability(1500, 1500, true)).toBeGreaterThan(winProbability(1500, 1500, false));
  });

  it("arranca desde el año pasado acercado a la media y deja limpios a los nuevos", () => {
    const { seeds, hasPrior } = seedRatings([1, 2], (n) => `k${n}`, new Map([["k1", 1700]]));
    expect(seeds.get(1)).toBeCloseTo(1500 + 0.75 * 200, 6);
    expect(seeds.get(2)).toBe(1500);
    expect([...hasPrior]).toEqual([1]);
  });

  it("starsFor reparte la dificultad", () => {
    expect([0.9, 0.7, 0.5, 0.35, 0.1].map(starsFor)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("métricas y atributos", () => {
  it("percentile: el mejor 1, el peor 0, empates a la mitad", () => {
    expect(percentile(5, [1, 3, 5])).toBe(1);
    expect(percentile(1, [1, 3, 5])).toBe(0);
    expect(percentile(3, [3, 3, 3])).toBe(0.5);
    expect(percentile(3, [3, 5])).toBeNull();
    expect(percentile(2, [1, 2, 3], false)).toBe(0.5);
    expect(toRating99(0)).toBe(45);
    expect(toRating99(1)).toBe(99);
  });

  it("computeMetrics: puntos por set, remontada, sets ajustados, casa y fuera", () => {
    const ms = [
      // gana 3-1 tras perder el 1.er set (25-22 es un set ajustado ganado)
      match("2026-01-01", 1, 2, 3, 1, [[20, 25], [25, 22], [25, 12], [25, 18]]),
      // pierde 1-3 fuera
      match("2026-01-08", 3, 1, 3, 1, [[25, 20], [25, 23], [20, 25], [25, 10]]),
    ];
    const m = computeMetrics(1, ms);
    expect(m).toMatchObject({ played: 2, wins: 1, homePlayed: 1, homeWins: 1, awayPlayed: 1, awayWins: 0 });
    expect(m.setsPlayed).toBe(8);
    expect(m.lostFirstSet).toBe(2); // perdimos el 1.er set en los dos partidos
    expect(m.comebackWins).toBe(1); // y solo remontamos el primero
    expect(m.closeSets).toBe(2); // 25-22 ganado en el partido 1 y 23-25 perdido en el 2
    expect(m.closeSetWins).toBe(1);
  });
});

describe("logros", () => {
  const ours = new Set([1]);
  const season = [
    match("2026-01-01", 1, 2, 3, 0, [[25, 10], [25, 12], [25, 8]]),
    match("2026-01-08", 3, 1, 1, 3, [[25, 20], [20, 25], [20, 25], [18, 25]]),
    match("2026-01-15", 1, 4, 3, 2, [[20, 25], [25, 20], [20, 25], [25, 22], [15, 12]]),
    match("2026-01-22", 1, 3, 1, 3, [[25, 20], [20, 25], [20, 25], [20, 25]]),
    match("2026-01-29", 3, 1, 0, 3, [[20, 25], [20, 25], [20, 25]]),
  ];
  const views = ourViewsOf(season, ours);
  const result = buildAchievements({ views, groupMatches: season, groupId: 1, previousLeaguePoints: 6, leaguePointsNow: 0 });
  const get = (id: string) => result.find((a) => a.id === id)!;

  it("racha: la fecha del partido que la desbloquea", () => {
    expect(bestWinStreak(views)).toBe(3);
    expect(get("racha-3")).toMatchObject({ unlocked: true, unlockedOn: "2026-01-15" });
    expect(get("racha-5")).toMatchObject({ unlocked: false, progress: { value: 3, target: 5 } });
  });

  it("remontada, quinto set y muralla", () => {
    // El 8 de enero ya ganamos fuera tras perder el 1.er set (20-25).
    expect(get("remontada")).toMatchObject({ unlocked: true, unlockedOn: "2026-01-08" });
    expect(get("sangre-fria")).toMatchObject({ unlocked: true, unlockedOn: "2026-01-15" });
    expect(get("muralla")).toMatchObject({ unlocked: true, unlockedOn: "2026-01-01" });
    expect(get("resurreccion").unlocked).toBe(false);
  });

  it("venganza: ganar a quien nos había ganado antes en la temporada", () => {
    // El equipo 3 nos gana el 22/01 y le ganamos el 29/01. Ganarle el 8/01 no cuenta: aún no nos había ganado.
    expect(get("venganza")).toMatchObject({ unlocked: true, unlockedOn: "2026-01-29" });
  });

  it("solo «Venganza» cuenta otras competiciones; el resto, la liga regular", () => {
    const other = (m: CompMatch): CompMatch => ({ ...m, groupId: 2 });
    const mixed = [
      // Fase previa (grupo 2): perdemos con el 5 y ganamos tres seguidos fuera de la liga.
      other(match("2026-01-01", 1, 5, 0, 3, [[10, 25], [10, 25], [10, 25]])),
      other(match("2026-01-02", 1, 6, 3, 0, [[25, 10], [25, 10], [25, 10]])),
      other(match("2026-01-03", 1, 7, 3, 0, [[25, 10], [25, 10], [25, 10]])),
      other(match("2026-01-04", 1, 8, 3, 0, [[25, 10], [25, 10], [25, 10]])),
      // Liga (grupo 1): ganamos al 5, que nos había ganado en la fase previa.
      match("2026-01-10", 1, 5, 3, 0, [[25, 20], [25, 20], [25, 20]]),
    ];
    const r = buildAchievements({ views: ourViewsOf(mixed, ours), groupMatches: mixed, groupId: 1, previousLeaguePoints: null, leaguePointsNow: 0 });
    const g = (id: string) => r.find((a) => a.id === id)!;
    expect(g("venganza")).toMatchObject({ unlocked: true, unlockedOn: "2026-01-10" });
    expect(g("racha-3").unlocked).toBe(false); // las 3 victorias de la fase previa no cuentan
    expect(g("racha-3").progress).toMatchObject({ value: 1, target: 3 });
    expect(g("muralla").unlocked).toBe(false); // el 25-10 fue en otra competición
  });

  it("superar el año pasado solo existe si hay temporada anterior", () => {
    expect(result.some((a) => a.id === "supera-el-ano-pasado")).toBe(true);
    const sin = buildAchievements({ views, groupMatches: season, groupId: 1, previousLeaguePoints: null, leaguePointsNow: 0 });
    expect(sin.some((a) => a.id === "supera-el-ano-pasado")).toBe(false);
  });
});

describe("con datos reales de la federación (liga masculina 2024-27)", () => {
  const bundles = fixture as unknown as FedTournamentBundle[];
  const at = (season: string, prev: string | null, today: string) =>
    buildCompetitiveStats({
      current: seasonDataFromBundles(bundles, season, "male"),
      previous: prev ? seasonDataFromBundles(bundles, prev, "male") : null,
      today,
    });

  const full = at("2025-26", "2024-25", "2026-05-30");

  it("2025-26 coincide con la clasificación oficial y con nuestro registro", () => {
    expect(full.hasLeague).toBe(true);
    expect(full.group?.name).toBe("LIGA ORO");
    expect(full.ourTeam?.name).toBe("CD VOLEYPUERTO");
    expect(full.card).toMatchObject({ played: 22, wins: 10, losses: 12, leaguePoints: 34, position: 5 });
    expect(full.standings[0]).toMatchObject({ name: "CDV SAN ROQUE", leaguePoints: 63, wins: 21, losses: 1 });
  });

  it("los rivales a batir salen con su último cruce real", () => {
    const meet = full.rivals.find((r) => r.name === "MEET MUSIC TOURISM")!;
    expect(meet.tags).toContain("cuenta-pendiente");
    expect(meet.meetings[0]).toMatchObject({ date: "2026-02-07", won: false, ownSets: 0, rivalSets: 3 });
    expect(meet.reason).toContain("Nos ganó 3-0 el 07/02");
    const top = full.rivals[0];
    expect(top.priority).toBeGreaterThanOrEqual(full.rivals[full.rivals.length - 1].priority);
  });

  it("todas las probabilidades están acotadas y las estrellas cuadran", () => {
    for (const r of full.rivals) {
      if (r.winProbability === null) {
        expect(r.stars).toBeNull();
        continue;
      }
      expect(r.winProbability).toBeGreaterThanOrEqual(0.03);
      expect(r.winProbability).toBeLessThanOrEqual(0.97);
      expect(r.stars).toBe(starsFor(r.winProbability));
    }
  });

  it("compara con el mismo punto del año pasado y los récords", () => {
    expect(full.versus).toMatchObject({ played: 22, pointsNow: 34, previousFinalPoints: 19, previousFinalPosition: 5 });
    expect(full.records.find((r) => r.key === "wins")).toMatchObject({ current: 10 });
    expect(full.achievements.find((a) => a.id === "supera-el-ano-pasado")?.unlocked).toBe(true);
  });

  it("la carrera de posiciones llega a la clasificación final", () => {
    const last = full.positionsByRound.at(-1)!;
    expect(last.positions[full.ourTeam!.id]).toBe(5);
  });

  it("2026-27 empieza limpia: ficha provisional, rivales nuevos sin rating", () => {
    const start = at("2026-27", "2025-26", "2026-10-16");
    expect(start.card?.provisional).toBe(true);
    expect(start.card?.ovr).toBeNull();
    expect(start.card?.rating).not.toBeNull(); // hereda el del año pasado
    const nuevo = start.rivals.find((r) => r.name === "LA PALMA VOLLEYBALL")!;
    expect(nuevo).toMatchObject({ rating: null, winProbability: null, stars: null, isNew: true });
    expect(nuevo.tags).toContain("nuevo");
    const conocido = start.rivals.find((r) => r.name === "CV YEJARAFE")!;
    expect(conocido.rating).not.toBeNull();
    expect(conocido.meetings.every((m) => m.season === "2025-26")).toBe(true);
    expect(start.nextMatch).toMatchObject({ date: "2026-10-24", home: true });
  });

  it("sin temporada anterior no inventa comparativas", () => {
    const sola = at("2024-25", null, "2025-06-01");
    expect(sola.hasPrevious).toBe(false);
    expect(sola.versus).toBeNull();
    expect(sola.previousCard).toBeNull();
    expect(sola.achievements.some((a) => a.id === "supera-el-ano-pasado")).toBe(false);
  });
});
