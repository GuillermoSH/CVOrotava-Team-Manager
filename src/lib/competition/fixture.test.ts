import { describe, expect, it } from "vitest";
import { parseTournamentBundle } from "@/lib/fed/parse";
import type { JsonApiDocument } from "@/lib/fed/client";
import liga from "@/lib/fed/__fixtures__/liga-senior-masc-2026-27.json";
import copa from "@/lib/fed/__fixtures__/copa-gobierno-masc-2026.json";
import { buildCompetition, type CompetitionInput } from "./build";

/** Datos reales de la federación (fixtures) → misma forma que lee el cargador de Supabase. */
function inputFrom(doc: unknown): CompetitionInput {
  const b = parseTournamentBundle(doc as JsonApiDocument);
  const facilities = new Map(b.facilities.map((f) => [f.id, f.name]));
  return {
    season: b.tournament.season,
    gender: "male",
    groups: b.groups.map((g) => ({ id: g.id, name: g.name, type: g.type, sort_order: g.sort_order })),
    rounds: b.rounds,
    teams: b.teams.map((t) => ({ id: t.id, name: t.name, club_id: t.club_id, is_our_club: t.is_our_club })),
    matches: b.matches.map((m) => ({
      ...m,
      facility_name: m.facility_id !== null ? facilities.get(m.facility_id) ?? null : null,
      sets: b.sets.filter((s) => s.match_id === m.id),
    })),
  };
}

describe("competición con datos reales de la federación", () => {
  it("la liga masculina trae los dos grupos, con todas sus jornadas", () => {
    const comp = buildCompetition(inputFrom(liga), "2026-10-30");
    expect(comp.groups.map((g) => g.name).sort()).toEqual(["GRUPO LAS PALMAS", "GRUPO TENERIFE"]);

    const tenerife = comp.groups.find((g) => g.name === "GRUPO TENERIFE")!;
    expect(tenerife.rounds).toHaveLength(12);
    expect(tenerife.hasOurs).toBe(true);
    expect(tenerife.standings).not.toBeNull();

    const laspalmas = comp.groups.find((g) => g.name === "GRUPO LAS PALMAS")!;
    expect(laspalmas.hasOurs).toBe(false);
    expect(laspalmas.teamIds.length).toBeGreaterThan(0);
  });

  it("una copa por eliminatorias no calcula clasificación", () => {
    const comp = buildCompetition(inputFrom(copa), "2026-10-30");
    expect(comp.groups.length).toBeGreaterThan(0);
    for (const g of comp.groups) expect(g.standings).toBeNull();
  });
});
