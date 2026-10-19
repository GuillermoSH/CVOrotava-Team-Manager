import { describe, expect, it } from "vitest";
import { needsContactRefresh, parseClubContact } from "./clubContacts";

describe("parseClubContact", () => {
  it("recorta espacios y convierte vacíos o tipos raros en null", () => {
    expect(parseClubContact({ phone: " 922 12 34 56 ", email: "club@x.es", headquarter: "" })).toEqual({
      phone: "922 12 34 56",
      email: "club@x.es",
      headquarter: null,
    });
    expect(parseClubContact({ phone: 922123456, email: null })).toEqual({
      phone: null,
      email: null,
      headquarter: null,
    });
    expect(parseClubContact(undefined).email).toBeNull();
  });
});

describe("needsContactRefresh", () => {
  const now = new Date("2026-10-19T12:00:00Z");
  it("pide el contacto si nunca se descargó o es antiguo", () => {
    expect(needsContactRefresh(null, now)).toBe(true);
    expect(needsContactRefresh("2026-10-10T12:00:00Z", now)).toBe(true);
  });
  it("no lo pide si es reciente", () => {
    expect(needsContactRefresh("2026-10-15T12:00:00Z", now)).toBe(false);
  });
});
