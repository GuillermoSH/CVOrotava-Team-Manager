import { leaguePointsFor } from "@/lib/fed/standings";
import { bestWinStreak } from "./achievements";
import type { OurView } from "./types";

export type RecordRow = {
  key: string;
  label: string;
  current: number;
  previous: number | null;
  /** false cuando menos es mejor (derrotas). */
  higherIsBetter: boolean;
};

export function seasonRecords(current: OurView[], previous: OurView[] | null): RecordRow[] {
  const stat = (views: OurView[]) => ({
    wins: views.filter((v) => v.won).length,
    losses: views.filter((v) => !v.won).length,
    streak: bestWinStreak(views),
    sweeps: views.filter((v) => v.won && v.rivalSets === 0).length,
    fiveSetWins: views.filter((v) => v.won && v.ownSets + v.rivalSets === 5).length,
    setsFor: views.reduce((a, v) => a + v.ownSets, 0),
    setsAgainst: views.reduce((a, v) => a + v.rivalSets, 0),
    bestSet: Math.max(0, ...views.flatMap((v) => v.sets.map((s) => s.own - s.rival))),
  });
  const c = stat(current);
  const p = previous ? stat(previous) : null;

  return [
    { key: "wins", label: "Victorias", current: c.wins, previous: p?.wins ?? null, higherIsBetter: true },
    { key: "losses", label: "Derrotas", current: c.losses, previous: p?.losses ?? null, higherIsBetter: false },
    { key: "streak", label: "Mejor racha de victorias", current: c.streak, previous: p?.streak ?? null, higherIsBetter: true },
    { key: "sweeps", label: "Victorias por 3-0", current: c.sweeps, previous: p?.sweeps ?? null, higherIsBetter: true },
    { key: "fiveSetWins", label: "Victorias al quinto set", current: c.fiveSetWins, previous: p?.fiveSetWins ?? null, higherIsBetter: true },
    { key: "setsDiff", label: "Diferencia de sets", current: c.setsFor - c.setsAgainst, previous: p ? p.setsFor - p.setsAgainst : null, higherIsBetter: true },
    { key: "bestSet", label: "Mayor ventaja en un set", current: c.bestSet, previous: p?.bestSet ?? null, higherIsBetter: true },
  ];
}

export type SamePoint = {
  /** Partidos de liga que llevamos jugados. */
  played: number;
  pointsNow: number;
  pointsThen: number;
  winsNow: number;
  winsThen: number;
  /** Puntos y puesto con los que acabó la temporada anterior. */
  previousFinalPoints: number;
  previousFinalPosition: number | null;
};

/** «Mismo punto del año pasado»: con los mismos partidos de liga jugados, ¿cómo íbamos? */
export function samePointLastYear(
  current: OurView[],
  previous: OurView[],
  groupId: number,
  previousGroupId: number,
  previousFinalPosition: number | null
): SamePoint | null {
  const now = current.filter((v) => v.match.groupId === groupId);
  const then = previous.filter((v) => v.match.groupId === previousGroupId);
  if (now.length === 0 || then.length === 0) return null;

  const upTo = then.slice(0, now.length);
  const pts = (views: OurView[]) => views.reduce((a, v) => a + leaguePointsFor(v.ownSets, v.rivalSets), 0);
  return {
    played: now.length,
    pointsNow: pts(now),
    pointsThen: pts(upTo),
    winsNow: now.filter((v) => v.won).length,
    winsThen: upTo.filter((v) => v.won).length,
    previousFinalPoints: pts(then),
    previousFinalPosition,
  };
}
