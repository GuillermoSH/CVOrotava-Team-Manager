import type { Gender } from "./build";

/** Detalle de un partido de la competición (de cualquier equipo). */
export const fedMatchHref = (fedMatchId: number): string => `/jornadas/partido/${fedMatchId}`;

/**
 * Destino de un partido nuestro: si viene de la federación se abre su detalle en Jornadas;
 * si no (amistosos, partidos creados a mano), el detalle de siempre.
 */
export function ourMatchHref(match: { id: string; fed_match_id?: number | null }): string {
  return match.fed_match_id ? fedMatchHref(match.fed_match_id) : `/matches/${match.id}`;
}

/** Vuelta a la lista de jornadas, en el mismo grupo y la misma jornada (`roundIndex` desde 1). */
export function jornadaHref(opts: { season: string; gender: Gender; groupId: number; roundIndex: number }): string {
  const qs = new URLSearchParams({
    season: opts.season,
    gender: opts.gender,
    grupo: String(opts.groupId),
    jornada: String(opts.roundIndex),
  });
  return `/jornadas?${qs}`;
}
