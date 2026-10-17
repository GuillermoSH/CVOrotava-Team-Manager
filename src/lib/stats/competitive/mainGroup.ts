import { type CompGroup, type SeasonData } from "./types";

/**
 * Grupo de liga regular de nuestro equipo: el grupo tipo "league" donde más
 * partidos jugamos (descarta fases previas de 2-3 partidos, Supercopa, fases finales…).
 */
export function pickMainGroup(data: SeasonData): CompGroup | null {
  const ours = new Set(data.teams.filter((t) => t.isOurs).map((t) => t.id));
  let best: { group: CompGroup; n: number } | null = null;
  for (const group of data.groups) {
    if (group.type !== "league") continue;
    const n = data.matches.filter(
      (m) => m.groupId === group.id && (ours.has(m.homeId) || ours.has(m.awayId))
    ).length;
    if (n > 0 && (!best || n > best.n)) best = { group, n };
  }
  return best?.group ?? null;
}

/** Equipo nuestro dentro de un grupo (el que más partidos tiene ahí). */
export function pickOurTeamId(data: SeasonData, groupId: number): number | null {
  const ours = new Set(data.teams.filter((t) => t.isOurs).map((t) => t.id));
  const count = new Map<number, number>();
  for (const m of data.matches) {
    if (m.groupId !== groupId) continue;
    for (const id of [m.homeId, m.awayId]) if (ours.has(id)) count.set(id, (count.get(id) ?? 0) + 1);
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}
