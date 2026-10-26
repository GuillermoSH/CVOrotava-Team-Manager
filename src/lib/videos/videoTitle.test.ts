import { describe, expect, it } from "vitest";
import { isUsefulYoutubeTitle, videoTitle } from "./videoTitle";

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

describe("videoTitle", () => {
  const league = { video_type: "league_match" as const };

  it("un vídeo enlazado a un partido se titula con el rival", () => {
    expect(
      videoTitle({ ...league, match: { opponent: "Tenerife Sur" } }, "2026-10-12", "Otro título")
    ).toBe("vs Tenerife Sur");
  });

  it("sin partido usa el título de YouTube si es útil", () => {
    expect(videoTitle(league, "2026-10-12", "  Final de liga  ")).toBe("Final de liga");
  });

  it("con una plantilla sin rellenar cae al tipo y la fecha", () => {
    expect(videoTitle(league, "2026-10-12", "Orotava vs [Equipo contrario]")).toBe(
      "Partido de Liga del 12 oct"
    );
  });

  it("sin título de YouTube también usa el tipo y la fecha", () => {
    expect(videoTitle({ video_type: "training" }, "2026-03-05")).toBe("Entrenamiento del 5 mar");
    expect(videoTitle({ video_type: "friendly_match" }, "2026-03-05", null)).toBe(
      "Partido Amistoso del 5 mar"
    );
  });
});
