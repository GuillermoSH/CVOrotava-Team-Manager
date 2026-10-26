import { describe, expect, it } from "vitest";
import { createVenueSchema, venueDeleteBlocker } from "./venueInput";

describe("createVenueSchema", () => {
  it("recorta los textos y acepta los tres tipos", () => {
    for (const location_type of ["home", "away", "outside_island"] as const) {
      const out = createVenueSchema.parse({
        venue_name: "  Pabellón Nuevo ",
        team_name: " CV Nuevo ",
        location_type,
      });
      expect(out).toEqual({ venue_name: "Pabellón Nuevo", team_name: "CV Nuevo", location_type });
    }
  });

  it("exige nombre, equipo y un tipo válido", () => {
    expect(createVenueSchema.safeParse({ venue_name: "A", team_name: "CV", location_type: "home" }).success).toBe(false);
    expect(createVenueSchema.safeParse({ venue_name: "Pabellón", team_name: " ", location_type: "home" }).success).toBe(false);
    expect(createVenueSchema.safeParse({ venue_name: "Pabellón", team_name: "CV", location_type: "casa" }).success).toBe(false);
  });
});

describe("venueDeleteBlocker", () => {
  it("permite borrar un pabellón sin partidos", () => {
    expect(venueDeleteBlocker(0)).toBeNull();
  });

  it("con partidos explica que hay que fusionarlo, en singular y plural", () => {
    expect(venueDeleteBlocker(1)).toContain("1 partido:");
    expect(venueDeleteBlocker(3)).toContain("3 partidos:");
    expect(venueDeleteBlocker(3)).toContain("fusiónalo");
  });
});
