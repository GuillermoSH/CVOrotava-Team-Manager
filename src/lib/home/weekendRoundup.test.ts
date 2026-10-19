import { describe, expect, it } from "vitest";
import { buildWeekendRoundup } from "./weekendRoundup";
import type { CompMatch, SeasonData } from "@/lib/stats/competitive/types";

const m = (over: Partial<CompMatch> & Pick<CompMatch, "id" | "homeId" | "awayId" | "date">): CompMatch => ({
  groupId: 1,
  roundIndex: 1,
  roundLabel: "Jornada 1",
  finished: true,
  homeSets: 3,
  awaySets: 0,
  sets: [],
  ...over,
});

const data = (matches: CompMatch[]): SeasonData => ({
  season: "2026-27",
  gender: "male",
  groups: [{ id: 1, name: "Liga", type: "league" }],
  teams: [
    { id: 1, name: "Orotava", clubId: 10, isOurs: true },
    { id: 2, name: "Yejarafe", clubId: 11, isOurs: false },
    { id: 3, name: "Arinaga", clubId: 12, isOurs: false },
    { id: 4, name: "Gáldar", clubId: 13, isOurs: false },
  ],
  matches,
});

describe("buildWeekendRoundup", () => {
  it("devuelve nuestro último partido y los demás de la misma jornada", () => {
    const r = buildWeekendRoundup(
      data([
        m({ id: 1, homeId: 1, awayId: 2, date: "2026-10-17", roundIndex: 1 }),
        m({ id: 2, homeId: 3, awayId: 4, date: "2026-10-17", roundIndex: 1, homeSets: 3, awaySets: 2 }),
        m({ id: 3, homeId: 1, awayId: 3, date: "2026-10-24", roundIndex: 2, roundLabel: "Jornada 2" }),
        m({ id: 4, homeId: 2, awayId: 4, date: "2026-10-24", roundIndex: 2, roundLabel: "Jornada 2", homeSets: 3, awaySets: 1 }),
      ]),
      "2026-10-26"
    );
    expect(r?.roundLabel).toBe("Jornada 2");
    expect(r?.ours.id).toBe(3);
    expect(r?.others.map((x) => x.id)).toEqual([4]);
    expect(r?.othersSwept).toBe(0);
  });

  it("cuenta los partidos resueltos sin ceder sets", () => {
    const r = buildWeekendRoundup(
      data([
        m({ id: 1, homeId: 1, awayId: 2, date: "2026-10-17" }),
        m({ id: 2, homeId: 3, awayId: 4, date: "2026-10-17", homeSets: 3, awaySets: 0 }),
      ]),
      "2026-10-20"
    );
    expect(r?.others).toHaveLength(1);
    expect(r?.othersSwept).toBe(1);
  });

  it("ignora partidos no jugados o futuros y devuelve null sin partido nuestro", () => {
    expect(
      buildWeekendRoundup(
        data([m({ id: 2, homeId: 3, awayId: 4, date: "2026-10-17" })]),
        "2026-10-20"
      )
    ).toBeNull();
    expect(
      buildWeekendRoundup(
        data([m({ id: 1, homeId: 1, awayId: 2, date: "2026-11-01" })]),
        "2026-10-20"
      )
    ).toBeNull();
  });

  it("sin jornada conocida usa una ventana de ±3 días", () => {
    const r = buildWeekendRoundup(
      data([
        m({ id: 1, homeId: 1, awayId: 2, date: "2026-10-18", roundIndex: null, roundLabel: null }),
        m({ id: 2, homeId: 3, awayId: 4, date: "2026-10-17", roundIndex: null, roundLabel: null }),
        m({ id: 3, homeId: 2, awayId: 4, date: "2026-10-04", roundIndex: null, roundLabel: null }),
      ]),
      "2026-10-20"
    );
    expect(r?.others.map((x) => x.id)).toEqual([2]);
  });
});
