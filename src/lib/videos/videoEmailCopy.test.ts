import { describe, expect, it } from "vitest";
import { isEligibleForVideoNotify } from "@/lib/videos/videoNotifyEligibility";
import {
  buildNewVideoEmailCopy,
  formatSetLine,
  matchOutcome,
  teamLabel,
} from "@/lib/videos/videoEmailCopy";

describe("video notify recipients", () => {
  it("keeps active users of that gender only", () => {
    expect(
      isEligibleForVideoNotify({ gender: "male", is_active: true }, "male")
    ).toBe(true);
    expect(
      isEligibleForVideoNotify({ gender: "female", is_active: true }, "male")
    ).toBe(false);
    expect(
      isEligibleForVideoNotify({ gender: "male", is_active: false }, "male")
    ).toBe(false);
    expect(
      isEligibleForVideoNotify({ gender: null, is_active: true }, "male")
    ).toBe(false);
    expect(
      isEligibleForVideoNotify({ gender: "female", is_active: true }, "female")
    ).toBe(true);
  });
});

describe("video email copy", () => {
  it("labels teams in Spanish", () => {
    expect(teamLabel("male")).toBe("Senior masculino");
    expect(teamLabel("female")).toBe("Senior femenino");
  });

  it("parses win and loss from set score", () => {
    expect(matchOutcome("3-1")).toEqual({
      score: "3-1",
      outcome: "win",
      outcomeLabel: "Victoria",
    });
    expect(matchOutcome("1-3")).toEqual({
      score: "1-3",
      outcome: "loss",
      outcomeLabel: "Derrota",
    });
  });

  it("formats set partials in order", () => {
    expect(
      formatSetLine([
        { set_number: 2, team_score: 18, opponent_score: 25 },
        { set_number: 1, team_score: 25, opponent_score: 20 },
      ])
    ).toBe("Parciales: 25-20 · 18-25");
  });

  it("writes a league recap with opponent and result in the subject", () => {
    const copy = buildNewVideoEmailCopy({
      videoType: "league_match",
      gender: "male",
      season: "2025/2026",
      match: {
        id: "m1",
        date: "2026-03-14",
        time: "20:00",
        opponent: "CV Tacoronte",
        result: "3-1",
        venues: { venue_name: "Casa", location_type: "home" },
        match_sets: [
          { set_number: 1, team_score: 25, opponent_score: 20 },
          { set_number: 2, team_score: 25, opponent_score: 18 },
          { set_number: 3, team_score: 22, opponent_score: 25 },
          { set_number: 4, team_score: 25, opponent_score: 21 },
        ],
      },
    });

    expect(copy.subject).toBe("Ya está el vídeo · vs CV Tacoronte (3-1)");
    expect(copy.headline).toMatch(/liga/i);
    expect(copy.recap?.opponent).toBe("CV Tacoronte");
    expect(copy.recap?.outcomeLabel).toBe("Victoria");
    expect(copy.recap?.sets).toContain("25-20");
    expect(copy.body).toContain("CV Tacoronte");
    expect(copy.kicker).toBe("Senior masculino · 2025/2026");
  });

  it("uses a generic league subject when the calendar has no match", () => {
    const copy = buildNewVideoEmailCopy({
      videoType: "league_match",
      gender: "female",
      season: "2025/2026",
    });
    expect(copy.subject).toBe("Ya está el vídeo · Partido de Liga");
    expect(copy.recap).toBeNull();
    expect(copy.body).toMatch(/femenino/i);
  });

  it("uses friendly copy, with opponent when linked", () => {
    const withMatch = buildNewVideoEmailCopy({
      videoType: "friendly_match",
      gender: "male",
      match: {
        id: "m2",
        date: "2026-02-01",
        opponent: "CV Laguna",
      },
    });
    expect(withMatch.subject).toBe("Ya está el vídeo · Amistoso vs CV Laguna");
    expect(withMatch.headline).toMatch(/amistoso/i);
    expect(withMatch.body).toContain("CV Laguna");

    const bare = buildNewVideoEmailCopy({
      videoType: "friendly_match",
      gender: "male",
    });
    expect(bare.subject).toBe("Ya está el vídeo · Partido Amistoso");
    expect(bare.recap).toBeNull();
  });

  it("uses training copy without a match recap", () => {
    const copy = buildNewVideoEmailCopy({
      videoType: "training",
      gender: "female",
      season: "2025/2026",
      match: {
        id: "should-ignore",
        date: "2026-01-01",
        opponent: "Nadie",
        result: "3-0",
      },
    });
    expect(copy.subject).toBe("Ya está el vídeo · Entrenamiento");
    expect(copy.headline).toMatch(/entrenamiento/i);
    expect(copy.recap).toBeNull();
    expect(copy.body).toMatch(/sesión/i);
  });
});
