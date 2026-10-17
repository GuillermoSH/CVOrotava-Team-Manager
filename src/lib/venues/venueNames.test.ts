import { describe, expect, it } from "vitest";
import { canLearnVenueAlias, findVenueByName, isPlaceholderVenueName, sameVenueName } from "./venueNames";
import { planVenueMerges } from "./adminVenues";

describe("sameVenueName", () => {
  it.each([
    ["Pabellón Quiquirá", "Pabellón Quiquirá La Orotava"],
    ["Pabellón Quiquirá", "PABELLÓN QUIQUIRÁ"],
    ["Pab. Miguel Ángel Díaz Molina", "Pab. Miguel A. Díaz Molina 2"],
    ["Pab. Miguel Ángel Díaz Molina", "Pabellón Miguel Angel Diaz Molina"],
    ["Pol. Mpal. Playa de Arinaga", "Pab. Playa de Arinaga 1"],
    ["Pab. Mpal. El Batán", "Pabellón Municipal El Batán"],
    ["Pab. García San Román", "Pab. Mpal. Carlos García San Román"],
    ["Pab. Loren Agua García", "PABELLÓN LOREN, AGUA GARCÍA"],
  ])("%s ≈ %s", (a, b) => {
    expect(sameVenueName(a, b)).toBe(true);
  });

  it.each([
    ["IES San Matías", "CEIP San Matías"],
    ["Pabellón Quiquirá", "Pab. Miguel Ángel Díaz Molina"],
    ["Pab. Mpal. La Victoria", "Pabellón La Esperanza"],
    ["Pabellón El Galeón", "Pab. Mpal. El Batán"],
  ])("%s ≠ %s", (a, b) => {
    expect(sameVenueName(a, b)).toBe(false);
  });
});

describe("findVenueByName", () => {
  const venues = [
    { id: "q", venue_name: "Pabellón Quiquirá", team_name: "Nuestro Equipo" },
    { id: "s1", venue_name: "CEIP San Matías", team_name: "CV Yejarafe" },
    { id: "s2", venue_name: "CEIP San Matías", team_name: "Voley Sonam" },
    { id: "i", venue_name: "IES San Matías", team_name: "CD Univol" },
  ];

  it("encuentra el venue aunque cambie el nombre", () => {
    expect(findVenueByName("Pabellón Quiquirá La Orotava", venues)?.id).toBe("q");
  });

  it("desempata filas del mismo pabellón por equipo local", () => {
    expect(findVenueByName("CEIP San Matías, Taco", venues, (t) => t === "Voley Sonam")?.id).toBe("s2");
  });

  it("no elige si dos sitios distintos encajan", () => {
    expect(findVenueByName("Pabellón San Matías", venues)).toBeNull();
  });
});

describe("planVenueMerges", () => {
  it("fusiona pendientes con revisados y agrupa pendientes entre sí", () => {
    const steps = planVenueMerges([
      { id: "q", venue_name: "Pabellón Quiquirá", needs_review: false },
      { id: "n1", venue_name: "Pabellón Quiquirá La Orotava", needs_review: true },
      { id: "p1", venue_name: "Pabellón Pablos Abril", needs_review: true },
      { id: "p2", venue_name: "PABELLÓN PABLOS ABRIL", needs_review: true },
      { id: "x", venue_name: "Pabellón Punta Larga", needs_review: true },
    ]);
    expect(steps.map((s) => [s.source, s.target])).toEqual([
      ["n1", "q"],
      ["p2", "p1"],
    ]);
  });
});

describe("isPlaceholderVenueName", () => {
  it.each(["POR DETERMINAR", "A determinar", "Sin asignar", "Pendiente de asignar"])("%s es un marcador", (n) => {
    expect(isPlaceholderVenueName(n)).toBe(true);
  });
  it("no confunde pabellones reales", () => {
    expect(isPlaceholderVenueName("Pabellón Quiquirá")).toBe(false);
  });
});

describe("canLearnVenueAlias", () => {
  it("hereda solo si los nombres encajan", () => {
    expect(canLearnVenueAlias("Pab. Playa de Arinaga 2", "Pol. Mpal. Playa de Arinaga")).toBe(true);
  });
  it.each([
    ["Pabellón Quiquirá", "Pab. Miguel Ángel Díaz Molina"],
    ["Pabellón Municipal El Galeón", "Pabellón de Tijoco"],
    ["Pabellón Juan Beltrán Sierra 3", "Pab. Mpal. El Batán"],
    ["POR DETERMINAR", "POR DETERMINAR"],
  ])("rechaza %s → %s", (facility, venue) => {
    expect(canLearnVenueAlias(facility, venue)).toBe(false);
  });
});
