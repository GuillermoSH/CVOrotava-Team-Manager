import { describe, expect, it } from "vitest";
import type { JsonApiDocument } from "./client";
import copa from "./__fixtures__/copa-gobierno-masc-2026.json";
import liga from "./__fixtures__/liga-senior-masc-2026-27.json";
import {
  genderFromText,
  isOurClub,
  isSeniorIndoorTournament,
  parseTournamentBundle,
  seasonFromText,
} from "./parse";

describe("helpers", () => {
  it("detecta nuestro club con cualquier variante de nombre", () => {
    expect(isOurClub("CV OROTAVA-PUERTO DE LA CRUZ")).toBe(true);
    expect(isOurClub("C.V. Orotava - Puerto de la Cruz B")).toBe(true);
    expect(isOurClub("CD VOLEYPUERTO")).toBe(true);
    expect(isOurClub("CD VOLEIPUERTO")).toBe(true);
    expect(isOurClub("CISNEROS LA LAGUNA")).toBe(false);
    expect(isOurClub("BENTAGUAIRE PUERTO DEL ROSARIO")).toBe(false);
  });

  it("filtra torneos sénior de pista", () => {
    expect(isSeniorIndoorTournament("Liga Canaria Sénior Masculina 2026/27 (2ª Div. Masculina)")).toBe(true);
    expect(isSeniorIndoorTournament("Fase Final Sénior Masculina - Femenina 21/22")).toBe(true);
    expect(isSeniorIndoorTournament("Fase Ascenso Final 2ª División Nacional Femenina 2022")).toBe(true);
    expect(isSeniorIndoorTournament("Competición Vóley Playa Sénior Masculino (2ª División) 2026/27")).toBe(false);
    expect(isSeniorIndoorTournament("Competición Cadete Femenino Isla de Tenerife 2026/27")).toBe(false);
    expect(isSeniorIndoorTournament("Competición Juvenil Femenina Isla de Tenerife 2025/26 FASE FINAL")).toBe(false);
    expect(isSeniorIndoorTournament("VPYA Senior Masculina TFE 18/19")).toBe(false);
  });

  it("normaliza temporadas a YYYY-YY", () => {
    expect(seasonFromText("Temporada 2026-2027 Voleibol")).toBe("2026-27");
    expect(seasonFromText("Liga Canaria Sénior Masculina 2019/20")).toBe("2019-20");
    expect(seasonFromText("Fase Final Sénior Masculina - Femenina 21/22")).toBeNull();
  });

  it("deduce género del nombre", () => {
    expect(genderFromText("Fase Final Femenina Oro")).toBe("female");
    expect(genderFromText("Fase Final Masculina")).toBe("male");
    expect(genderFromText("Grupo A")).toBeNull();
  });
});

describe("parseTournamentBundle — partido terminado (Copa Gobierno 2026)", () => {
  const b = parseTournamentBundle(copa as unknown as JsonApiDocument);

  it("torneo con temporada desde el recurso season", () => {
    expect(b.tournament).toMatchObject({ id: 1342939, season: "2026-27", gender: "male", status: "finished" });
  });

  it("resultado final: sets y puntos de liga por equipo", () => {
    const m = b.matches.find((x) => x.id === 145586831)!;
    expect(m).toMatchObject({
      home_team_id: 15930764,
      away_team_id: 15930766,
      finished: true,
      home_sets: 3,
      away_sets: 2,
      home_league_points: 2,
      away_league_points: 1,
      local_date: "2026-09-25",
      local_time: "09:30:00",
      timezone: "Atlantic/Canary",
    });
    expect(m.report_url).toContain("pdf-url-redirect");
  });

  it("puntos de cada set incluido el tie-break, en orden", () => {
    const sets = b.sets.filter((s) => s.match_id === 145586831);
    expect(sets.map((s) => [s.set_number, s.home_points, s.away_points])).toEqual([
      [1, 19, 25],
      [2, 25, 21],
      [3, 25, 12],
      [4, 22, 25],
      [5, 15, 11],
    ]);
  });

  it("sets coherentes con el resultado en todos los partidos", () => {
    for (const m of b.matches.filter((x) => x.finished)) {
      const sets = b.sets.filter((s) => s.match_id === m.id);
      if (sets.length === 0) continue;
      const home = sets.filter((s) => s.home_points > s.away_points).length;
      const away = sets.filter((s) => s.away_points > s.home_points).length;
      expect([home, away]).toEqual([m.home_sets, m.away_sets]);
    }
  });

  it("toda jornada pertenece a un grupo del torneo y todo partido a una jornada", () => {
    const groupIds = new Set(b.groups.map((g) => g.id));
    const roundIds = new Set(b.rounds.map((r) => r.id));
    expect(b.rounds.every((r) => groupIds.has(r.group_id))).toBe(true);
    expect(b.matches.every((m) => m.round_id !== null && roundIds.has(m.round_id))).toBe(true);
  });
});

describe("parseTournamentBundle — liga en curso (Sénior Masculina 2026/27)", () => {
  const b = parseTournamentBundle(liga as unknown as JsonApiDocument);

  it("marca nuestro equipo", () => {
    const ours = b.teams.filter((t) => t.is_our_club);
    expect(ours.map((t) => t.id)).toEqual([15941872]);
  });

  it("partido pendiente: fecha y pabellón, sin resultado ni sets", () => {
    const m = b.matches.find((x) => x.id === 145743586)!;
    expect(m).toMatchObject({
      home_team_id: 15941872,
      away_team_id: 15937840,
      facility_id: 78339,
      local_date: "2026-10-24",
      local_time: "16:30:00", // API: 15:30 UTC; PDF oficial: 16:30 (verano canario)
      finished: false,
      home_sets: null,
      away_sets: null,
      home_league_points: null,
    });
    expect(b.sets.some((s) => s.match_id === 145743586)).toBe(false);
  });

  it("hora local: +1 h en verano canario y sin cambio en invierno (contra el PDF oficial)", () => {
    const ours = (date: string) =>
      b.matches.find((x) => x.local_date === date && [x.home_team_id, x.away_team_id].includes(15941872))!;
    expect(ours("2026-10-24").local_time).toBe("16:30:00");
    expect(ours("2026-11-01").local_time).toBe("17:00:00");
    expect(ours("2026-11-14").local_time).toBe("17:30:00");
  });

  it("lee el ID de club (estable entre temporadas) y lo agrupa en clubs", () => {
    const withClub = b.teams.filter((t) => t.club_id !== null);
    expect(withClub.length).toBe(b.teams.length);
    expect(b.teams.find((t) => t.id === 15941872)?.club_id).toBe(4496978);
    expect(b.clubs).toHaveLength(new Set(b.teams.map((t) => t.club_id)).size);
    expect(b.clubs.every((c) => c.last_season === "2026-27")).toBe(true);
  });

  it("grupos con género del torneo", () => {
    expect(b.groups.map((g) => g.name).sort()).toEqual(["GRUPO LAS PALMAS", "GRUPO TENERIFE"]);
    expect(b.groups.every((g) => g.gender === "male")).toBe(true);
  });
});

describe("club propio por ID de club", () => {
  const team = (id: string, name: string, club: string) => ({
    type: "team",
    id,
    attributes: { name },
    relationships: { club: { data: { type: "club", id: club } } },
  });
  const doc = {
    data: {
      type: "tournament",
      id: "1",
      attributes: { name: "Liga Test 2026/27", gender: "male", status: "in_progress" },
      relationships: {},
    },
    included: [
      team("10", "CV OROTAVA-PUERTO DE LA CRUZ", "4496978"),
      team("11", "EQUIPO B SIN NOMBRE CLAVE", "4496978"),
      team("12", "CISNEROS LA LAGUNA", "4496871"),
    ],
  } as unknown as JsonApiDocument;

  it("marca como propios todos los equipos del club, aunque el nombre no lo diga", () => {
    const b = parseTournamentBundle(doc);
    expect(b.teams.filter((t) => t.is_our_club).map((t) => t.id).sort()).toEqual([10, 11]);
  });
});
