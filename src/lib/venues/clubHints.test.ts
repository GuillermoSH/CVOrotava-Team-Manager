import { describe, expect, it } from "vitest";
import { clubVenueHints } from "./clubHints";

const venues = [
  { id: "diaz", venue_name: "Pab. Miguel Ángel Díaz Molina", needs_review: false, location_type: "home" as const },
  { id: "quiq", venue_name: "Pabellón Quiquirá", needs_review: false, location_type: "home" as const },
  { id: "galeon", venue_name: "Pabellón El Galeón", needs_review: false, location_type: "away" as const },
  { id: "new1", venue_name: "Pabellón Nuevo Sin Pista", needs_review: true, location_type: "away" as const },
  { id: "new2", venue_name: "Polideportivo Otro", needs_review: true, location_type: "away" as const },
];
const clubName = new Map([[10, "Nausicaa"], [20, "Orotava"], [30, "Cisneros"]]);

describe("clubVenueHints", () => {
  it("sugiere el venue revisado donde el mismo club juega de local", () => {
    const hints = clubVenueHints({
      venues,
      homeClubs: new Map([
        ["galeon", new Map([[10, 17]])],
        ["new1", new Map([[10, 3]])],
      ]),
      clubName,
    });
    expect(hints.get("new1")).toEqual({
      id: "galeon",
      venue_name: "Pabellón El Galeón",
      location_type: "away",
      club_name: "Nausicaa",
    });
  });

  it("no sugiere nada si ningún club coincide ni para pabellones ya revisados", () => {
    const hints = clubVenueHints({
      venues,
      homeClubs: new Map([
        ["galeon", new Map([[10, 17]])],
        ["new2", new Map([[30, 2]])],
        ["diaz", new Map([[20, 5]])],
      ]),
      clubName,
    });
    expect(hints.has("new2")).toBe(false);
    expect(hints.has("diaz")).toBe(false);
  });

  it("entre varios candidatos elige el que más comparten", () => {
    const hints = clubVenueHints({
      venues,
      homeClubs: new Map([
        ["diaz", new Map([[20, 4]])],
        ["quiq", new Map([[20, 30]])],
        ["new1", new Map([[20, 6]])],
      ]),
      clubName,
    });
    expect(hints.get("new1")?.id).toBe("quiq");
  });
});
