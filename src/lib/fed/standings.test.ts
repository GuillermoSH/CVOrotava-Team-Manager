import { describe, expect, it } from "vitest";
import { computeStandings, leaguePointsFor, type StandingsMatch } from "./standings";

const m = (
  home: number,
  away: number,
  hs: number,
  as: number,
  hp: number | null = null,
  ap: number | null = null
): StandingsMatch => ({
  home_team_id: home,
  away_team_id: away,
  finished: true,
  home_sets: hs,
  away_sets: as,
  home_league_points: null,
  away_league_points: null,
  home_points: hp,
  away_points: ap,
});

describe("leaguePointsFor", () => {
  it("3-0/3-1 → 3, 3-2 → 2, 2-3 → 1, 0-3/1-3 → 0", () => {
    expect([leaguePointsFor(3, 0), leaguePointsFor(3, 1), leaguePointsFor(3, 2)]).toEqual([3, 3, 2]);
    expect([leaguePointsFor(2, 3), leaguePointsFor(1, 3), leaguePointsFor(0, 3)]).toEqual([1, 0, 0]);
  });
});

describe("computeStandings", () => {
  it("ordena por puntos y acumula sets", () => {
    const rows = computeStandings([1, 2, 3], [m(1, 2, 3, 0), m(2, 3, 3, 2), m(3, 1, 1, 3)]);
    expect(rows.map((r) => [r.team_id, r.position, r.league_points, r.won, r.lost])).toEqual([
      [1, 1, 6, 2, 0],
      [2, 2, 2, 1, 1],
      [3, 3, 1, 0, 2],
    ]);
    expect(rows[0]).toMatchObject({ sets_for: 6, sets_against: 1, played: 2 });
  });

  it("usa los puntos de liga del acta si vienen", () => {
    const match = { ...m(1, 2, 3, 0), home_league_points: 2, away_league_points: 1 };
    const rows = computeStandings([1, 2], [match]);
    expect(rows.map((r) => r.league_points)).toEqual([2, 1]);
  });

  it("desempata por cociente de sets con mismos puntos y victorias", () => {
    // 1 y 2: 4 pts y 1 victoria. Sets 1 → 5/3, 2 → 5/4.
    const rows = computeStandings(
      [1, 2, 3, 4],
      [m(1, 3, 3, 0), m(2, 4, 3, 1), m(4, 1, 3, 2), m(3, 2, 3, 2)]
    );
    expect(rows.slice(0, 2).map((r) => [r.team_id, r.league_points, r.won])).toEqual([
      [1, 4, 1],
      [2, 4, 1],
    ]);
  });

  it("ignora partidos sin terminar o sin resultado", () => {
    const pending = { ...m(1, 2, 0, 0), finished: false, home_sets: null, away_sets: null };
    const rows = computeStandings([1, 2], [pending]);
    expect(rows.every((r) => r.played === 0)).toBe(true);
  });
});
