import { describe, expect, it } from "vitest";
import { bestOpponentDistance, opponentDistance, planMatchLinks, prettyTeamName } from "./linkPlan";

describe("opponentDistance", () => {
  it("empareja variantes reales del mismo rival", () => {
    expect(opponentDistance("Dos 19 Arinaga", "DOS19 ARINAGA")).not.toBeNull();
    expect(opponentDistance("Betanguaire Puerto del Rosario", "BENTAGUAIRE PUERTO DEL ROSARIO")).not.toBeNull();
    expect(opponentDistance("CV Gupane", "CV GUPANE GUIA")).not.toBeNull();
    expect(opponentDistance("CV El Montillo - La Matanza", "CV EL MONTILLO-LA MATANZA")).toBe(0);
  });

  it("no confunde equipos que solo comparten palabras genéricas", () => {
    expect(opponentDistance("CV Suac Canarias", "CV SAYRE CANARIAS LUZ")).toBeNull();
    expect(opponentDistance("Tacoronte Voleycruz", "CV LA VICTORIA")).toBeNull();
  });
});

describe("planMatchLinks", () => {
  const fed = [
    { fedId: 1, date: "2026-01-23", opponent: "CV EL MONTILLO-LA MATANZA" },
    { fedId: 2, date: "2026-02-01", opponent: "TACORONTE VOLEYCRUZ" },
    { fedId: 3, date: "2026-05-09", opponent: "CD UNIVOL" },
  ];

  it("enlaza con ±2 días de margen y deja el resto para crear", () => {
    const plan = planMatchLinks(fed, [
      { id: "a", date: "2026-01-24", opponent: "CV El Montillo-La Matanza", fed_match_id: null },
      { id: "b", date: "2026-02-01", opponent: "Tacoronte Voleycruz", fed_match_id: null },
    ]);
    expect(Object.fromEntries(plan.links)).toEqual({ 1: "a", 2: "b" });
    expect(plan.creates).toEqual([3]);
  });

  it("respeta enlaces existentes y no reutiliza una fila ya enlazada", () => {
    const plan = planMatchLinks(fed, [
      { id: "a", date: "2026-01-24", opponent: "CV El Montillo-La Matanza", fed_match_id: 1 },
      { id: "x", date: "2026-02-01", opponent: "Tacoronte Voleycruz", fed_match_id: 999 },
    ]);
    expect(Object.fromEntries(plan.links)).toEqual({ 1: "a" });
    expect(plan.creates).toEqual([2, 3]);
  });

  it("no enlaza si la fecha está a más de 2 días", () => {
    const plan = planMatchLinks(fed.slice(1, 2), [
      { id: "b", date: "2026-02-05", opponent: "Tacoronte Voleycruz", fed_match_id: null },
    ]);
    expect(plan.links.size).toBe(0);
  });
});

describe("nombres alternativos del club (mismo ID de club en otras temporadas)", () => {
  // Club 4496989: hoy CV SAN ROQUE; antes CV ACAYMO. Nosotros lo teníamos apuntado como Acaymo.
  it("empareja un rival renombrado si algún nombre antiguo del club encaja", () => {
    expect(opponentDistance("CV SAN ROQUE", "CV Acaymo")).toBeNull();
    expect(bestOpponentDistance(["CV SAN ROQUE", "CDV SAN ROQUE", "CV ACAYMO"], "CV Acaymo")).toBe(0);
  });

  it("planMatchLinks usa los alias para enlazar", () => {
    const ours = [{ id: "a", date: "2022-11-05", opponent: "CV Acaymo", fed_match_id: null }];
    const withAliases = [{ fedId: 1, date: "2022-11-05", opponent: "CV SAN ROQUE", opponentAliases: ["CV ACAYMO"] }];
    expect(Object.fromEntries(planMatchLinks(withAliases, ours).links)).toEqual({ 1: "a" });
    expect(planMatchLinks([{ ...withAliases[0], opponentAliases: [] }], ours).links.size).toBe(0);
  });

  it("sin nombre parecido no enlaza aunque haya alias", () => {
    expect(bestOpponentDistance(["CV SAYRE", "CV SAYRE PATUMOVIL"], "Tacoronte Voleycruz")).toBeNull();
  });
});

describe("prettyTeamName", () => {
  it("capitaliza sin romper siglas", () => {
    expect(prettyTeamName("CV OROTAVA-PUERTO DE LA CRUZ")).toBe("CV Orotava-Puerto de la Cruz");
    expect(prettyTeamName("CV LOS GERANIOS P-H")).toBe("CV Los Geranios P-H");
    expect(prettyTeamName("CDV SAN ROQUE")).toBe("CDV San Roque");
  });
});
