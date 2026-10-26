import { describe, expect, it } from "vitest";
import { isUsefulYoutubeTitle, shortVenueName, videoDetails, videoTitle } from "./videoTitle";

describe("isUsefulYoutubeTitle", () => {
  it("acepta un título normal", () => {
    expect(isUsefulYoutubeTitle("CV Orotava vs Tenerife Sur - Jornada 3")).toBe(true);
  });

  it("descarta vacíos y plantillas sin rellenar", () => {
    expect(isUsefulYoutubeTitle(null)).toBe(false);
    expect(isUsefulYoutubeTitle("   ")).toBe(false);
    expect(isUsefulYoutubeTitle("Orotava vs [Equipo contrario]")).toBe(false);
    expect(isUsefulYoutubeTitle("vs equipo contrario")).toBe(false);
    expect(isUsefulYoutubeTitle("Partido [FECHA]")).toBe(false);
  });
});

describe("shortVenueName", () => {
  it("quita el tipo de instalación del principio", () => {
    expect(shortVenueName("Pabellón Quiquirá")).toBe("Quiquirá");
    expect(shortVenueName("Pab. Miguel A. Díaz Molina 2")).toBe("Miguel A. Díaz Molina 2");
    expect(shortVenueName("Polideportivo Municipal de La Laguna")).toBe("La Laguna");
    expect(shortVenueName("  PABELLÓN DEL Galeón ")).toBe("Galeón");
  });

  it("no toca nombres sin ese prefijo ni deja el nombre vacío", () => {
    expect(shortVenueName("IES San Matías")).toBe("IES San Matías");
    expect(shortVenueName("Pabellón")).toBe("Pabellón");
  });
});

describe("videoTitle", () => {
  const league = { video_type: "league_match" as const, gender: "male" as const };
  const match = {
    opponent: "La Palma Volleyball",
    date: "2026-10-24",
    result: "3-1",
    venues: { venue_name: "Pabellón Quiquirá" },
  };

  it("un vídeo de partido se titula con el equipo y el rival", () => {
    expect(videoTitle({ ...league, match }, "Otro título")).toBe("S.M. vs La Palma Volleyball");
    expect(videoTitle({ video_type: "friendly_match", gender: "female", match })).toBe(
      "S.F. vs La Palma Volleyball"
    );
  });

  it("sin partido usa el título de YouTube si es útil", () => {
    expect(videoTitle(league, "  Final de liga  ")).toBe("Final de liga");
  });

  it("con una plantilla sin rellenar o sin título cae al tipo y el equipo", () => {
    expect(videoTitle(league, "Orotava vs [Equipo contrario]")).toBe("Partido de Liga S.M.");
    expect(videoTitle({ video_type: "training", gender: "female" })).toBe("Entrenamiento S.F.");
    expect(videoTitle({ video_type: "friendly_match", gender: "male" }, null)).toBe(
      "Partido Amistoso S.M."
    );
  });
});

describe("videoDetails", () => {
  const league = { video_type: "league_match" as const, gender: "male" as const };

  it("lleva tipo, género y pabellón del partido", () => {
    expect(
      videoDetails({
        ...league,
        match: { opponent: "X", date: "2026-10-24", result: null, venues: { venue_name: "Pabellón Quiquirá" } },
      })
    ).toBe("Partido de Liga · Masculino · Quiquirá");
  });

  it("acepta el pabellón como lista y omite lo que falta", () => {
    expect(
      videoDetails({
        video_type: "friendly_match",
        gender: "female",
        match: { opponent: "X", date: "2026-10-24", result: null, venues: [{ venue_name: "Pab. Galeón" }] },
      })
    ).toBe("Partido Amistoso · Femenino · Galeón");
    expect(
      videoDetails({
        ...league,
        match: { opponent: "X", date: "2026-10-24", result: null, venues: null },
      })
    ).toBe("Partido de Liga · Masculino");
    expect(videoDetails({ video_type: "training", gender: "male" })).toBe("Entrenamiento · Masculino");
  });
});
