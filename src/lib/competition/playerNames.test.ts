import { describe, expect, it } from "vitest";
import { buildNameResolver, nameTokens } from "./playerNames";

describe("nameTokens", () => {
  it("ignora tildes, mayúsculas, signos y la marca de capitán", () => {
    expect(nameTokens("Rodríguez  Aníbal (C)")).toEqual(["RODRIGUEZ", "ANIBAL"]);
    expect(nameTokens("")).toEqual([]);
  });
});

describe("buildNameResolver", () => {
  it("el nombre y el apellido al revés son la misma persona; se muestra la variante más frecuente", () => {
    const r = buildNameResolver([["FERNANDEZ ADAY"], ["FERNANDEZ ADAY"], ["ADAY FERNANDEZ"]]);
    expect(r("ADAY FERNANDEZ")).toBe("FERNANDEZ ADAY");
    expect(r("FERNANDEZ ADAY")).toBe("FERNANDEZ ADAY");
  });

  it("las tildes y la marca de capitán no crean otra persona", () => {
    const r = buildNameResolver([["RODRÍGUEZ ANIBAL (C)"], ["RODRIGUEZ ANIBAL"], ["RODRIGUEZ ANIBAL"]]);
    expect(r("RODRÍGUEZ ANIBAL (C)")).toBe("RODRIGUEZ ANIBAL");
    expect(r("RODRIGUEZ ANIBAL")).toBe("RODRIGUEZ ANIBAL");
  });

  it("si falta un apellido se une al nombre completo y se muestra el más completo", () => {
    const r = buildNameResolver([["RAMIREZ PAULA"], ["PAULA RAMÍREZ SOSA"], ["RAMIREZ PAULA"]]);
    expect(r("RAMIREZ PAULA")).toBe("PAULA RAMÍREZ SOSA");
    expect(r("PAULA RAMÍREZ SOSA")).toBe("PAULA RAMÍREZ SOSA");
  });

  it("no une si el nombre corto cabe en dos personas distintas", () => {
    const r = buildNameResolver([["GARCIA JUAN"], ["GARCIA JUAN JOSE"], ["GARCIA JUAN GREGORIO"]]);
    expect(r("GARCIA JUAN")).toBe("GARCIA JUAN");
    expect(r("GARCIA JUAN JOSE")).toBe("GARCIA JUAN JOSE");
    expect(r("GARCIA JUAN GREGORIO")).toBe("GARCIA JUAN GREGORIO");
  });

  it("no une dos nombres que salen juntos en la plantilla de un mismo partido", () => {
    const r = buildNameResolver([["GARCIA JUAN", "GARCIA JUAN JOSE"], ["GARCIA JUAN JOSE"]]);
    expect(r("GARCIA JUAN")).toBe("GARCIA JUAN");
    expect(r("GARCIA JUAN JOSE")).toBe("GARCIA JUAN JOSE");
  });

  it("un nombre de una sola palabra no se une a nadie", () => {
    const r = buildNameResolver([["LEAL"], ["AGORA LEAL FERNANDEZ"]]);
    expect(r("LEAL")).toBe("LEAL");
  });

  it("un nombre que no estaba en las plantillas se devuelve limpio", () => {
    expect(buildNameResolver([["A B"]])("  X Y (C) ")).toBe("X Y");
  });

  it("personas distintas con el mismo apellido no se mezclan", () => {
    const r = buildNameResolver([["MARTIN BETSAIDA", "MARTIN SOFIA"]]);
    expect(r("MARTIN BETSAIDA")).toBe("MARTIN BETSAIDA");
    expect(r("MARTIN SOFIA")).toBe("MARTIN SOFIA");
  });
});
