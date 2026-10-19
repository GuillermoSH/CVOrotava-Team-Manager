import { describe, expect, it } from "vitest";
import { groupRivalClubs, type ClubRow } from "./rivalClubs";
import { telHref } from "./telHref";

const club = (id: number, name: string, over: Partial<ClubRow> = {}): ClubRow => ({
  id,
  name,
  phone: null,
  email: null,
  headquarter: null,
  ...over,
});

describe("groupRivalClubs", () => {
  const tournaments = [
    { id: 1, name: "Liga Sénior Masculina" },
    { id: 2, name: "Liga Sénior Femenina" },
  ];
  const clubs = [club(10, "CV Yejarafe", { email: "y@x.es" }), club(11, "Arinaga"), club(99, "Nuestro club")];

  it("agrupa por club con las competiciones compartidas y sin los equipos nuestros", () => {
    const out = groupRivalClubs(
      tournaments,
      [
        { tournament_id: 1, club_id: 10, is_our_club: false },
        { tournament_id: 2, club_id: 10, is_our_club: false },
        { tournament_id: 1, club_id: 11, is_our_club: false },
        { tournament_id: 1, club_id: 99, is_our_club: true },
      ],
      clubs
    );
    expect(out.map((c) => c.name)).toEqual(["Arinaga", "CV Yejarafe"]);
    expect(out[1].tournaments).toEqual(["Liga Sénior Femenina", "Liga Sénior Masculina"]);
    expect(out[1].email).toBe("y@x.es");
  });

  it("ignora equipos sin club, torneos desconocidos y clubes sin ficha", () => {
    const out = groupRivalClubs(
      tournaments,
      [
        { tournament_id: 1, club_id: null, is_our_club: false },
        { tournament_id: 3, club_id: 10, is_our_club: false },
        { tournament_id: 1, club_id: 500, is_our_club: false },
      ],
      clubs
    );
    expect(out).toEqual([]);
  });
});

describe("telHref", () => {
  it("deja solo dígitos y el +", () => {
    expect(telHref("+34 600 12-34-56")).toBe("tel:+34600123456");
    expect(telHref("922 33 44 55")).toBe("tel:922334455");
  });
});
