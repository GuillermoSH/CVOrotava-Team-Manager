import { describe, expect, it } from "vitest";
import type { CompetitionMatch, CompetitionTeam } from "./build";
import { buildTeamBrief, MAX_FACTS, MIN_SAMPLE } from "./teamBrief";
import type { Ratio, TeamProfile } from "./teamProfile";

const T = 10;
const r = (n: number, of: number): Ratio => ({ n, of });

/** Ficha vacía: se le cambia solo lo que cada prueba necesita. */
function profile(over: Partial<TeamProfile> = {}): TeamProfile {
  return {
    teamId: T,
    played: 8,
    withReport: 8,
    smallSample: false,
    record: { won: 5, lost: 3, setsFor: 17, setsAgainst: 12, wins30: 2, wins32: 1, losses03: 1, losses23: 1 },
    sets: { played: 29, won: 17, firstSet: r(4, 8), tight: r(4, 8), decider: r(1, 2), avgFor: 24, avgAgainst: 22, avgDurationMin: 25 },
    timeouts: { total: 0, sets: 20, perSet: 0, avgLead: null, trailing3: r(0, 0), leading3: r(0, 0), phase: { early: 0, mid: 0, late: 0 }, first: r(0, 0) },
    substitutions: { total: 0, perSet: 0, phase: { early: 0, mid: 0, late: 0 }, byPosition: [0, 0, 0, 0, 0, 0], returned: r(0, 0), topIn: [] },
    lineups: { sets: 0, sextets: [], distinctSextets: 0, startsServing: r(0, 0) },
    flow: {
      sets: 0,
      serve: r(0, 0),
      receive: r(0, 0),
      avgRunFor: null,
      avgRunAgainst: null,
      bestRunFor: null,
      worstRunAgainst: null,
      avgLeadChanges: null,
      comebacks: r(0, 0),
      blownLeads: r(0, 0),
      closeFinishes: r(0, 0),
      afterTimeout: { nextPoint: r(0, 0), stopsRun: r(0, 0) },
    },
    players: [],
    coaches: [],
    sanctions: { W: 0, P: 0, E: 0, D: 0 },
    ...over,
  };
}

type M = Pick<CompetitionMatch, "id" | "status" | "homeId" | "awayId" | "homeSets" | "awaySets" | "date">;
const m = (id: number, home: number, away: number, hs: number, as: number, date: string): M => ({
  id,
  status: "played",
  homeId: home,
  awayId: away,
  homeSets: hs,
  awaySets: as,
  date,
});

const teams: Record<number, CompetitionTeam> = {
  [T]: { id: T, name: "RIVAL", clubId: 1, isOurs: false },
  20: { id: 20, name: "OTRO", clubId: 2, isOurs: false },
  30: { id: 30, name: "NOSOTROS", clubId: 3, isOurs: true },
};

describe("buildTeamBrief: cómo va", () => {
  it("resume victorias, derrotas, sets y los últimos cinco resultados por orden de fecha", () => {
    const matches = [
      m(1, T, 20, 3, 0, "2026-10-01"), // gana
      m(2, 20, T, 3, 1, "2026-10-08"), // pierde
      m(3, T, 20, 3, 2, "2026-10-15"), // gana
      m(4, 20, T, 0, 3, "2026-10-22"), // gana
      m(5, T, 20, 3, 1, "2026-10-29"), // gana
      m(6, 20, T, 3, 0, "2026-11-05"), // pierde
    ];
    // Se entregan desordenados: el orden sale de la fecha
    const b = buildTeamBrief(profile(), [...matches].reverse(), teams);
    expect(b.headline).toBe("5 victorias y 3 derrotas (sets 17-12). Últimos partidos: D V V V D.");
  });

  it("no inventa nada sin partidos jugados", () => {
    const b = buildTeamBrief(profile({ played: 0, withReport: 0 }), [], teams);
    expect(b.headline).toBeNull();
    expect(b.facts).toEqual([]);
    expect(b.caution).toBeNull();
  });

  it("cuenta lo que ha pasado contra el club esta temporada", () => {
    const b = buildTeamBrief(profile(), [m(1, T, 30, 1, 3, "2026-10-04"), m(2, 30, T, 3, 2, "2026-12-13")], teams);
    expect(b.versusUs).toEqual(["Perdió 1-3 contra el club (04/10/2026).", "Perdió 2-3 contra el club (13/12/2026)."]);
  });
});

describe("buildTeamBrief: datos de impacto", () => {
  it("un primer set muy ganado o muy perdido sale como punto fuerte o débil, con su recuento", () => {
    const fuerte = buildTeamBrief(profile({ sets: { ...profile().sets, firstSet: r(7, 8) } }), [], teams);
    expect(fuerte.facts[0]).toMatchObject({ id: "first-set", tone: "strength", section: "t-record" });
    expect(fuerte.facts[0].text).toContain("7 de 8");
    const debil = buildTeamBrief(profile({ sets: { ...profile().sets, firstSet: r(2, 8) } }), [], teams);
    expect(debil.facts[0]).toMatchObject({ id: "first-set", tone: "weakness" });
  });

  it("con un porcentaje normal o con pocos casos no dice nada", () => {
    expect(buildTeamBrief(profile({ sets: { ...profile().sets, firstSet: r(4, 8) } }), [], teams).facts).toEqual([]);
    expect(buildTeamBrief(profile({ sets: { ...profile().sets, firstSet: r(3, MIN_SAMPLE - 1) } }), [], teams).facts).toEqual([]);
  });

  it("los finales apretados pesan más que el primer set a igual desviación", () => {
    const b = buildTeamBrief(profile({ sets: { ...profile().sets, firstSet: r(7, 8), tight: r(1, 8) } }), [], teams);
    expect(b.facts.map((f) => f.id)).toEqual(["tight", "first-set"]);
  });

  it("recibir mal o un saque que no hace daño salen del jugada a jugada, y exigen muestra", () => {
    const flow = { ...profile().flow, sets: 8, receive: r(40, 100), serve: r(30, 100) };
    const b = buildTeamBrief(profile({ flow }), [], teams);
    expect(b.facts.map((f) => f.id).sort()).toEqual(["receive", "serve"]);
    expect(b.facts.every((f) => f.tone === "weakness" && f.section === "t-flow")).toBe(true);
    expect(b.facts.find((f) => f.id === "receive")?.text).toContain("40 %");
    // Con pocas jugadas no se afirma
    const poca = buildTeamBrief(profile({ flow: { ...flow, receive: r(5, 10), serve: r(3, 10) } }), [], teams);
    expect(poca.facts).toEqual([]);
  });

  it("ventajas perdidas y remontadas", () => {
    const flow = { ...profile().flow, sets: 8, blownLeads: r(3, 5), comebacks: r(3, 4) };
    const ids = buildTeamBrief(profile({ flow }), [], teams).facts.map((f) => f.id).sort();
    expect(ids).toEqual(["blown", "comeback"]);
  });

  it("sus costumbres con los tiempos muertos: cuántos, cuándo y con qué marcador", () => {
    const timeouts = { ...profile().timeouts, total: 18, sets: 12, perSet: 1.5, trailing3: r(11, 18), phase: { early: 2, mid: 4, late: 12 } };
    const f = buildTeamBrief(profile({ timeouts }), [], teams).facts.find((x) => x.id === "timeouts");
    expect(f).toMatchObject({ tone: "habit", section: "t-timeouts" });
    expect(f?.text).toContain("1,5 por set");
    expect(f?.text).toContain("11 de 18");
    expect(f?.text).toContain("en la parte final del set (12 de 18)");
  });

  it("sexteto fijo, o cambios constantes de sexteto", () => {
    const fijo = profile({ lineups: { sets: 10, distinctSextets: 2, startsServing: r(5, 10), sextets: [{ numbers: [1, 2, 3, 4, 5, 6], names: [], count: 8, share: 0.8 }] } });
    expect(buildTeamBrief(fijo, [], teams).facts.find((x) => x.id === "lineup-fixed")?.text).toBe("Sexteto casi fijo: 1-2-3-4-5-6 en 8 de 10 sets.");
    const varia = profile({ lineups: { sets: 10, distinctSextets: 7, startsServing: r(5, 10), sextets: [{ numbers: [1, 2, 3, 4, 5, 6], names: [], count: 2, share: 0.2 }] } });
    expect(buildTeamBrief(varia, [], teams).facts.find((x) => x.id === "lineup-changing")?.text).toContain("7 distintos en 10 sets");
  });

  it("cambios: cuántos, en qué posición y quién entra", () => {
    const substitutions = { total: 20, perSet: 2, phase: { early: 5, mid: 8, late: 7 }, byPosition: [1, 2, 10, 3, 2, 2], returned: r(8, 20), topIn: [{ name: "PEREZ JUAN", times: 6 }] };
    const f = buildTeamBrief(profile({ substitutions }), [], teams).facts.find((x) => x.id === "subs");
    expect(f?.text).toBe("Cambios: cambia mucho (2,0 por set); sobre todo en la posición III; quien más entra es PEREZ JUAN (6).");
  });

  it("disciplina solo si hay varias sanciones", () => {
    expect(buildTeamBrief(profile({ sanctions: { W: 1, P: 0, E: 0, D: 0 } }), [], teams).facts).toEqual([]);
    expect(buildTeamBrief(profile({ sanctions: { W: 3, P: 1, E: 0, D: 1 } }), [], teams).facts[0].id).toBe("sanctions");
  });

  it("no enseña más de seis datos y van del más al menos relevante", () => {
    const flow = { ...profile().flow, sets: 10, receive: r(30, 100), serve: r(25, 100), blownLeads: r(4, 5), comebacks: r(4, 5), afterTimeout: { nextPoint: r(2, 10), stopsRun: r(0, 0) }, avgRunAgainst: 9 };
    const p = profile({
      sets: { ...profile().sets, firstSet: r(8, 8), tight: r(0, 8), avgFor: 20, avgAgainst: 25 },
      flow,
      timeouts: { ...profile().timeouts, total: 18, sets: 12, perSet: 1.5, trailing3: r(11, 18), phase: { early: 2, mid: 4, late: 12 } },
      lineups: { sets: 10, distinctSextets: 2, startsServing: r(5, 10), sextets: [{ numbers: [1, 2, 3, 4, 5, 6], names: [], count: 8, share: 0.8 }] },
      sanctions: { W: 5, P: 0, E: 0, D: 0 },
    });
    const facts = buildTeamBrief(p, [], teams).facts;
    expect(facts).toHaveLength(MAX_FACTS);
    for (let i = 1; i < facts.length; i++) expect(facts[i - 1].weight).toBeGreaterThanOrEqual(facts[i].weight);
  });
});

describe("buildTeamBrief: avisos de muestra", () => {
  it("sin actas dice que solo hay resultados; con pocas, que es una pista", () => {
    expect(buildTeamBrief(profile({ withReport: 0 }), [], teams).caution).toContain("Todavía no hay actas");
    expect(buildTeamBrief(profile({ withReport: 2, smallSample: true }), [], teams).caution).toBe("Solo hay 2 actas leídas: tómalo como una pista, no como una regla.");
    expect(buildTeamBrief(profile({ withReport: 1, smallSample: true }), [], teams).caution).toContain("1 acta leída:");
    expect(buildTeamBrief(profile(), [], teams).caution).toBeNull();
  });
});
