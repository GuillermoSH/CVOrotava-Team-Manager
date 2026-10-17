import type { FedTournamentBundle } from "@/lib/fed/parse";
import type { CompMatch, CompSet, Gender, SeasonData } from "./types";

/**
 * Torneos sincronizados (filas `fed_*`) → entrada del motor para una temporada y género.
 * Funciona igual con datos recién parseados de la API y con filas leídas de Supabase.
 */
export function seasonDataFromBundles(
  bundles: FedTournamentBundle[],
  season: string,
  gender: Gender
): SeasonData {
  const mine = bundles.filter((b) => b.tournament.season === season);

  const groups = mine.flatMap((b) =>
    b.groups
      .filter((g) => g.gender === gender)
      .map((g) => ({ id: g.id, name: g.name, type: g.type }))
  );
  const groupIds = new Set(groups.map((g) => g.id));

  const teams = new Map<number, SeasonData["teams"][number]>();
  for (const b of mine)
    for (const t of b.teams)
      teams.set(t.id, { id: t.id, name: t.name, clubId: t.club_id, isOurs: t.is_our_club });

  const matches: CompMatch[] = [];
  for (const b of mine) {
    // Posición de cada jornada dentro de su grupo (1, 2, 3…)
    const roundIndex = new Map<number, number>();
    const roundLabel = new Map<number, string>();
    const byGroup = new Map<number, typeof b.rounds>();
    for (const r of b.rounds) byGroup.set(r.group_id, [...(byGroup.get(r.group_id) ?? []), r]);
    for (const rounds of byGroup.values()) {
      [...rounds]
        .sort((x, y) => (x.sort_order ?? 0) - (y.sort_order ?? 0) || x.id - y.id)
        .forEach((r, i) => {
          roundIndex.set(r.id, i + 1);
          roundLabel.set(r.id, r.name);
        });
    }

    const setsByMatch = new Map<number, CompSet[]>();
    for (const s of [...b.sets].sort((x, y) => x.set_number - y.set_number))
      setsByMatch.set(s.match_id, [
        ...(setsByMatch.get(s.match_id) ?? []),
        { home: s.home_points, away: s.away_points },
      ]);

    for (const m of b.matches) {
      if (!groupIds.has(m.group_id) || m.canceled || m.rest) continue;
      if (m.home_team_id === null || m.away_team_id === null || !m.local_date) continue;
      matches.push({
        id: m.id,
        groupId: m.group_id,
        roundIndex: m.round_id !== null ? roundIndex.get(m.round_id) ?? null : null,
        roundLabel: m.round_id !== null ? roundLabel.get(m.round_id) ?? null : null,
        date: m.local_date,
        homeId: m.home_team_id,
        awayId: m.away_team_id,
        finished: m.finished,
        homeSets: m.home_sets,
        awaySets: m.away_sets,
        sets: setsByMatch.get(m.id) ?? [],
      });
    }
  }

  return { season, gender, groups, teams: [...teams.values()], matches };
}
