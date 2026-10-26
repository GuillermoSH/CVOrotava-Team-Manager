import { describe, expect, it } from "vitest";
import { formatTitleDate, isUsefulYoutubeTitle, shortVenueName, videoTitle } from "./videoTitle";

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

describe("formatTitleDate", () => {
  it("pone día-mes-año", () => {
    expect(formatTitleDate("2026-10-24")).toBe("24-10-2026");
    expect(formatTitleDate("2026-03-05T18:00:00+00:00")).toBe("05-03-2026");
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
    opponent: "La Palma Voleyball",
    date: "2026-10-24",
    result: "3-1",
    venues: { venue_name: "Pabellón Quiquirá" },
  };

  it("un vídeo de partido lleva tipo, equipo, rival, fecha y pabellón", () => {
    expect(videoTitle({ ...league, match }, "2026-10-25", "Otro título")).toBe(
      "Partido de Liga S.M. vs La Palma Voleyball 24-10-2026 Quiquirá"
    );
  });

  it("femenino y amistoso", () => {
    expect(
      videoTitle({ video_type: "friendly_match", gender: "female", match }, "2026-10-25")
    ).toBe("Partido Amistoso S.F. vs La Palma Voleyball 24-10-2026 Quiquirá");
  });

  it("sin pabellón omite ese tramo; con la relación como lista funciona igual", () => {
    expect(videoTitle({ ...league, match: { ...match, venues: null } }, "2026-10-25")).toBe(
      "Partido de Liga S.M. vs La Palma Voleyball 24-10-2026"
    );
    expect(
      videoTitle(
        { ...league, match: { ...match, venues: [{ venue_name: "Pabellón Quiquirá" }] } },
        "2026-10-25"
      )
    ).toBe("Partido de Liga S.M. vs La Palma Voleyball 24-10-2026 Quiquirá");
    expect(
      videoTitle({ ...league, match: { ...match, venues: { venue_name: "  " } } }, "2026-10-25")
    ).toBe("Partido de Liga S.M. vs La Palma Voleyball 24-10-2026");
  });

  it("sin partido usa el título de YouTube si es útil", () => {
    expect(videoTitle(league, "2026-10-12", "  Final de liga  ")).toBe("Final de liga");
  });

  it("con una plantilla sin rellenar o sin título cae al tipo, equipo y fecha", () => {
    expect(videoTitle(league, "2026-10-12", "Orotava vs [Equipo contrario]")).toBe(
      "Partido de Liga S.M. 12-10-2026"
    );
    expect(videoTitle({ video_type: "training", gender: "female" }, "2026-03-05")).toBe(
      "Entrenamiento S.F. 05-03-2026"
    );
    expect(videoTitle({ video_type: "friendly_match", gender: "male" }, "2026-03-05", null)).toBe(
      "Partido Amistoso S.M. 05-03-2026"
    );
  });
});
