import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import TeamBrief from "./TeamBrief";
import BetaNotice from "./BetaNotice";
import TeamProfileView from "@/app/(protected)/jornadas/equipo/[id]/TeamProfileView";
import { buildTeamBrief } from "@/lib/competition/teamBrief";
import type { CompetitionTeam } from "@/lib/competition/build";
import type { TeamContext } from "@/lib/competition/loadTeam";
import type { Ratio, TeamProfile } from "@/lib/competition/teamProfile";

const r = (n: number, of: number): Ratio => ({ n, of });
const T = 10;
const team: CompetitionTeam = { id: T, name: "CV RIVAL", clubId: 1, isOurs: false };

function profile(over: Partial<TeamProfile> = {}): TeamProfile {
  return {
    teamId: T,
    played: 8,
    withReport: 8,
    smallSample: false,
    record: { won: 5, lost: 3, setsFor: 17, setsAgainst: 12, wins30: 2, wins32: 1, losses03: 1, losses23: 1 },
    sets: { played: 29, won: 17, firstSet: r(7, 8), tight: r(1, 8), decider: r(1, 2), avgFor: 24, avgAgainst: 22, avgDurationMin: 25 },
    timeouts: { total: 0, sets: 20, perSet: 0, avgLead: null, trailing3: r(0, 0), leading3: r(0, 0), phase: { early: 0, mid: 0, late: 0 }, first: r(0, 0) },
    substitutions: { total: 0, perSet: 0, phase: { early: 0, mid: 0, late: 0 }, byPosition: [0, 0, 0, 0, 0, 0], returned: r(0, 0), topIn: [] },
    lineups: { sets: 0, sextets: [], distinctSextets: 0, startsServing: r(0, 0) },
    flow: {
      sets: 0, serve: r(0, 0), receive: r(0, 0), avgRunFor: null, avgRunAgainst: null, bestRunFor: null, worstRunAgainst: null,
      avgLeadChanges: null, comebacks: r(0, 0), blownLeads: r(0, 0), closeFinishes: r(0, 0), afterTimeout: { nextPoint: r(0, 0), stopsRun: r(0, 0) },
    },
    players: [],
    coaches: [],
    sanctions: { W: 0, P: 0, E: 0, D: 0 },
    ...over,
  };
}

const clean = (markup: string) => {
  expect(markup).not.toMatch(/undefined|NaN|\[object|Infinity/);
  return markup;
};

describe("aviso de beta", () => {
  it("es una nota discreta que dice que la sección irá cambiando", () => {
    const out = clean(renderToStaticMarkup(<BetaNotice />));
    expect(out).toContain('role="note"');
    expect(out).toContain("Beta");
    expect(out).toContain("irá cambiando de forma poco a poco");
    // Icono de probeta
    expect(out).toContain('data-icon="vial"');
  });
});

describe("claves para el partido", () => {
  const teams = { [T]: team };

  it("enseña los datos de más impacto con su etiqueta y un enlace al detalle", () => {
    const brief = buildTeamBrief(profile(), [], teams);
    const out = clean(renderToStaticMarkup(<TeamBrief brief={brief} name="CV Rival" />));
    expect(out).toContain("Claves para el partido contra CV Rival");
    expect(out).toContain("Punto débil");
    expect(out).toContain("Punto fuerte");
    expect(out).toContain('href="#t-record"');
    expect(out).toContain("7 de 8");
  });

  it("avisa cuando hay pocas actas", () => {
    const brief = buildTeamBrief(profile({ withReport: 2, smallSample: true }), [], teams);
    expect(clean(renderToStaticMarkup(<TeamBrief brief={brief} name="X" />))).toContain("tómalo como una pista");
  });

  it("sin nada que decir no pinta el bloque", () => {
    const brief = buildTeamBrief(profile({ played: 0, withReport: 0 }), [], teams);
    expect(renderToStaticMarkup(<TeamBrief brief={brief} name="X" />)).toBe("");
  });

  it("si nada se sale de lo normal lo dice, en vez de dejar el bloque vacío", () => {
    const played = [{ id: 1, status: "played" as const, homeId: T, awayId: 20, homeSets: 3, awaySets: 0, date: "2026-10-01" }];
    const brief = buildTeamBrief(profile({ sets: { ...profile().sets, firstSet: r(4, 8), tight: r(4, 8) } }), played, teams);
    expect(clean(renderToStaticMarkup(<TeamBrief brief={brief} name="X" />))).toContain("Nada se sale de lo normal");
  });
});

describe("la ficha del equipo", () => {
  const ctx: TeamContext = {
    season: "2026-27",
    gender: "male",
    team,
    groups: [{ id: 1, name: "GRUPO TENERIFE", standing: null }],
    matches: [],
    teams: { [T]: team },
    profile: profile(),
  };

  it("lleva las claves antes del detalle", () => {
    const out = clean(renderToStaticMarkup(<TeamProfileView ctx={ctx} />));
    const brief = out.indexOf("Claves para el partido contra");
    const detail = out.indexOf('id="t-record"');
    expect(brief).toBeGreaterThan(-1);
    expect(detail).toBeGreaterThan(brief);
  });
});
