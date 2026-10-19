import { describe, expect, it } from "vitest";
import { groupContactsByTeam, telHref, type ContactRow, type PlayerRow, type TeamRow } from "./groupContacts";

const teams: TeamRow[] = [
  { id: "t2", name: "Infantil Femenino", category: "infantil", gender: "female" },
  { id: "t1", name: "Alevín Masculino", category: "alevin", gender: "male" },
  { id: "t3", name: "Vacío", category: "x", gender: "male" },
];
const contact = (over: Partial<ContactRow>): ContactRow => ({
  id: "c",
  player_id: "p1",
  full_name: "Contacto",
  relationship: "madre",
  phone: "600000000",
  email: "a@b.c",
  is_primary: false,
  ...over,
});

describe("groupContactsByTeam", () => {
  const players: PlayerRow[] = [
    { id: "p1", full_name: "Zoe", team_id: "t1", is_active: true },
    { id: "p2", full_name: "Ana", team_id: "t1", is_active: true },
    { id: "p3", full_name: "Inactiva", team_id: "t1", is_active: false },
    { id: "p4", full_name: "SinEquipo", team_id: null, is_active: true },
    { id: "p5", full_name: "SinContacto", team_id: "t2", is_active: true },
  ];

  it("ordena equipos y jugadores por nombre y deja fuera inactivos, sin equipo y sin contacto", () => {
    const out = groupContactsByTeam(teams, players, [
      contact({ id: "1", player_id: "p1" }),
      contact({ id: "2", player_id: "p2" }),
      contact({ id: "3", player_id: "p3" }),
      contact({ id: "4", player_id: "p4" }),
    ]);
    expect(out.map((t) => t.teamName)).toEqual(["Alevín Masculino"]);
    expect(out[0].players.map((p) => p.playerName)).toEqual(["Ana", "Zoe"]);
  });

  it("pone primero el contacto principal cuando hay dos", () => {
    const out = groupContactsByTeam(teams, players, [
      contact({ id: "a", player_id: "p1", full_name: "Abuela", is_primary: false }),
      contact({ id: "b", player_id: "p1", full_name: "Madre", is_primary: true }),
    ]);
    expect(out[0].players[0].contacts.map((c) => c.id)).toEqual(["b", "a"]);
  });
});

describe("telHref", () => {
  it("deja solo dígitos y el +", () => {
    expect(telHref("+34 600 12-34-56")).toBe("tel:+34600123456");
    expect(telHref("922 33 44 55")).toBe("tel:922334455");
  });
});
