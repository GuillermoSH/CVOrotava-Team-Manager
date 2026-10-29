import { describe, expect, it } from "vitest";
import { fedMatchHref, jornadaHref, ourMatchHref } from "./links";

describe("ourMatchHref", () => {
  it("un partido de la federación abre su detalle en Jornadas", () => {
    expect(ourMatchHref({ id: "abc", fed_match_id: 145743000 })).toBe("/jornadas/partido/145743000");
  });

  it("un amistoso o un partido creado a mano abre el detalle de siempre", () => {
    expect(ourMatchHref({ id: "abc", fed_match_id: null })).toBe("/matches/abc");
    expect(ourMatchHref({ id: "abc" })).toBe("/matches/abc");
  });
});

describe("fedMatchHref", () => {
  it("ruta del detalle", () => {
    expect(fedMatchHref(7)).toBe("/jornadas/partido/7");
  });
});

describe("jornadaHref", () => {
  it("vuelve al mismo grupo y jornada", () => {
    const href = jornadaHref({ season: "2026-27", gender: "male", groupId: 3711352, roundIndex: 2 });
    const qs = new URLSearchParams(href.split("?")[1]);
    expect(href.startsWith("/jornadas?")).toBe(true);
    expect(Object.fromEntries(qs)).toEqual({ season: "2026-27", gender: "male", grupo: "3711352", jornada: "2" });
  });
});
