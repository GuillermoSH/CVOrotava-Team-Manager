/**
 * Entrada pura del motor de estadísticas competitivas: sin Supabase ni fechas
 * del sistema, para poder testearlo y validarlo con datos reales cacheados.
 */

export type Gender = "male" | "female";

export type CompSet = { home: number; away: number };

export type CompMatch = {
  id: number;
  groupId: number;
  /** Posición de la jornada dentro del grupo (1, 2, 3…); null si no se conoce. */
  roundIndex: number | null;
  roundLabel: string | null;
  /** YYYY-MM-DD, hora local de Canarias. */
  date: string;
  homeId: number;
  awayId: number;
  finished: boolean;
  homeSets: number | null;
  awaySets: number | null;
  /** Puntos de cada set, en orden. Vacío si el acta no los trae. */
  sets: CompSet[];
  /** Solo en partidos nuestros: tipo de pabellón (casa / fuera / viaje) de nuestro registro. */
  venueType?: "home" | "away" | "outside_island" | null;
};

export type CompTeam = {
  id: number;
  name: string;
  /** ID de club de la federación: estable entre temporadas (null en torneos antiguos). */
  clubId: number | null;
  isOurs: boolean;
};

export type CompGroup = {
  id: number;
  name: string;
  type: string | null;
};

export type SeasonData = {
  season: string;
  gender: Gender;
  groups: CompGroup[];
  teams: CompTeam[];
  matches: CompMatch[];
};

export const isPlayed = (m: CompMatch): boolean =>
  m.finished && m.homeSets !== null && m.awaySets !== null;

/** Clave estable de un rival entre temporadas: club de la federación, o el nombre si no hay. */
export function rivalKey(team: Pick<CompTeam, "clubId" | "name">, normalize: (s: string) => string): string {
  return team.clubId !== null ? `c${team.clubId}` : `n:${normalize(team.name)}`;
}

/** Vista de un partido desde nuestro equipo. */
export type OurView = {
  match: CompMatch;
  home: boolean;
  rivalId: number;
  ownSets: number;
  rivalSets: number;
  won: boolean;
  /** Sets desde nuestro punto de vista. */
  sets: { own: number; rival: number }[];
};

export function viewFor(m: CompMatch, teamId: number): OurView | null {
  if (!isPlayed(m)) return null;
  const home = m.homeId === teamId;
  if (!home && m.awayId !== teamId) return null;
  const ownSets = (home ? m.homeSets : m.awaySets)!;
  const rivalSets = (home ? m.awaySets : m.homeSets)!;
  return {
    match: m,
    home,
    rivalId: home ? m.awayId : m.homeId,
    ownSets,
    rivalSets,
    won: ownSets > rivalSets,
    sets: m.sets.map((s) => (home ? { own: s.home, rival: s.away } : { own: s.away, rival: s.home })),
  };
}
