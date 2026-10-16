import type { JsonApiDocument, JsonApiResource } from "./client";

/**
 * Parser puro: documento JSON:API de un torneo (con includes) → filas `fed_*`.
 * Sin IO, para poder testearlo con fixtures.
 */

export const FIRST_SYNCED_SEASON = "2019-20";

/**
 * Nombre de nuestro club en Leverade varía según temporada y género:
 * "CV OROTAVA", "C.V. Orotava - Puerto de la Cruz", y el sénior masculino
 * inscrito como "CD VOLEYPUERTO" / "CD VOLEIPUERTO" (verificado contra `matches` 2025-26).
 */
const OUR_CLUB_NAME = /orotava|voley ?puerto|volei ?puerto/;

export function isOurClub(teamName: string): boolean {
  return OUR_CLUB_NAME.test(foldText(teamName));
}

/** Torneos sénior de pista (Liga Canaria y fases finales); excluye vóley playa. */
export function isSeniorIndoorTournament(name: string): boolean {
  const n = foldText(name);
  if (/playa|vpya/.test(n)) return false;
  if (/benjamin|alevin|infantil|cadete|juvenil|junior/.test(n)) return false;
  return /senior|2a div|2ª div|segunda division/.test(n) || /fase (de )?(ascenso )?final/.test(n);
}

/** "Temporada 2026-2027 Voleibol" | "... 2026/27" → "2026-27". */
export function seasonFromText(text: string): string | null {
  const long = /(\d{4})\s*[-/]\s*(\d{4})/.exec(text);
  if (long) return `${long[1]}-${long[2].slice(2)}`;
  const short = /(\d{4})\s*[-/]\s*(\d{2})(?!\d)/.exec(text);
  if (short) return `${short[1]}-${short[2]}`;
  return null;
}

export function genderFromText(text: string): "male" | "female" | null {
  const n = foldText(text);
  if (/femen/.test(n)) return "female";
  if (/mascul/.test(n)) return "male";
  return null;
}

function foldText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// ─── Filas ────────────────────────────────────────────────────

export type FedTournamentRow = {
  id: number;
  name: string;
  season: string;
  gender: "male" | "female" | "mixed";
  status: string;
};
export type FedGroupRow = {
  id: number;
  tournament_id: number;
  name: string;
  type: string | null;
  sort_order: number | null;
  gender: "male" | "female" | null;
};
export type FedRoundRow = {
  id: number;
  group_id: number;
  name: string;
  sort_order: number | null;
};
export type FedTeamRow = {
  id: number;
  tournament_id: number;
  name: string;
  is_our_club: boolean;
  /** ID de club de la federación: estable entre temporadas (null en torneos antiguos). */
  club_id: number | null;
};
export type FedClubRow = {
  id: number;
  name: string;
  /** Temporada de este nombre; el sync conserva el nombre de la más reciente. */
  last_season: string;
};
export type FedFacilityRow = { id: number; name: string };
export type FedMatchRow = {
  id: number;
  tournament_id: number;
  group_id: number;
  round_id: number | null;
  home_team_id: number | null;
  away_team_id: number | null;
  facility_id: number | null;
  local_date: string | null;
  local_time: string | null;
  timezone: string;
  finished: boolean;
  canceled: boolean;
  postponed: boolean;
  rest: boolean;
  home_sets: number | null;
  away_sets: number | null;
  home_league_points: number | null;
  away_league_points: number | null;
  report_url: string | null;
  fed_updated_at: string | null;
};
export type FedMatchSetRow = {
  match_id: number;
  set_number: number;
  home_points: number;
  away_points: number;
};

export type FedTournamentBundle = {
  tournament: FedTournamentRow;
  groups: FedGroupRow[];
  rounds: FedRoundRow[];
  teams: FedTeamRow[];
  clubs: FedClubRow[];
  facilities: FedFacilityRow[];
  matches: FedMatchRow[];
  sets: FedMatchSetRow[];
};

/** Includes necesarios para `parseTournamentBundle` en una sola petición. */
export const TOURNAMENT_INCLUDES = [
  "season",
  "teams",
  "groups.rounds.matches.facility",
  "groups.rounds.matches.results",
  "groups.rounds.matches.periods.results",
].join(",");

// ─── Helpers JSON:API ─────────────────────────────────────────

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() !== "" ? v : null;
const int = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};
const bool = (v: unknown): boolean => v === true;

function relId(res: JsonApiResource, rel: string): string | null {
  const d = res.relationships?.[rel]?.data;
  return d && !Array.isArray(d) ? d.id : null;
}

function relIds(res: JsonApiResource, rel: string): string[] {
  const d = res.relationships?.[rel]?.data;
  return Array.isArray(d) ? d.map((x) => x.id) : [];
}

/** "2026-10-24 15:30:00" → { date: "2026-10-24", time: "15:30:00" } */
function splitDateTime(v: unknown): { date: string | null; time: string | null } {
  const s = str(v);
  const m = s && /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)/.exec(s);
  return m ? { date: m[1], time: m[2] } : { date: null, time: null };
}

/** Marcas de auditoría de Leverade ("YYYY-MM-DD HH:MM:SS", UTC) → ISO. */
function auditTimestamp(v: unknown): string | null {
  const s = str(v);
  return s && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)
    ? `${s.replace(" ", "T")}Z`
    : null;
}

// ─── Parser ───────────────────────────────────────────────────

export function parseTournamentBundle(doc: JsonApiDocument): FedTournamentBundle {
  if (Array.isArray(doc.data)) throw new Error("Expected a single tournament document");
  const t = doc.data;
  const included = doc.included ?? [];

  const byType = new Map<string, Map<string, JsonApiResource>>();
  for (const r of included) {
    if (!byType.has(r.type)) byType.set(r.type, new Map());
    byType.get(r.type)!.set(r.id, r);
  }
  const all = (type: string) => [...(byType.get(type)?.values() ?? [])];
  const one = (type: string, id: string | null) =>
    id ? byType.get(type)?.get(id) ?? null : null;

  const tName = str(t.attributes?.name) ?? `Torneo ${t.id}`;
  const seasonRes = one("season", relId(t, "season"));
  const season =
    seasonFromText(str(seasonRes?.attributes?.name) ?? "") ?? seasonFromText(tName);
  if (!season) throw new Error(`Cannot resolve season for tournament ${t.id} (${tName})`);

  const rawGender = str(t.attributes?.gender);
  const tGender: FedTournamentRow["gender"] =
    rawGender === "male" || rawGender === "female"
      ? rawGender
      : genderFromText(tName) ?? "mixed";

  const tournamentId = Number(t.id);
  const tournament: FedTournamentRow = {
    id: tournamentId,
    name: tName,
    season,
    gender: tGender,
    status: str(t.attributes?.status) ?? "unknown",
  };

  const groups: FedGroupRow[] = all("group").map((g) => {
    const name = str(g.attributes?.name) ?? `Grupo ${g.id}`;
    return {
      id: Number(g.id),
      tournament_id: tournamentId,
      name,
      type: str(g.attributes?.type),
      sort_order: int(g.attributes?.order),
      gender: tGender === "mixed" ? genderFromText(name) : tGender,
    };
  });

  // Jornada → grupo (la relación viene en el grupo: group.rounds[])
  const roundGroup = new Map<string, string>();
  for (const g of all("group")) for (const rid of relIds(g, "rounds")) roundGroup.set(rid, g.id);

  const rounds: FedRoundRow[] = all("round")
    .filter((r) => roundGroup.has(r.id))
    .map((r) => ({
      id: Number(r.id),
      group_id: Number(roundGroup.get(r.id)),
      name: str(r.attributes?.name) ?? String(r.attributes?.order ?? r.id),
      sort_order: int(r.attributes?.order),
    }));

  const teams: FedTeamRow[] = all("team").map((tm) => {
    const name = (str(tm.attributes?.name) ?? `Equipo ${tm.id}`).trim();
    return {
      id: Number(tm.id),
      tournament_id: tournamentId,
      name,
      is_our_club: isOurClub(name),
      club_id: int(relId(tm, "club")),
    };
  });

  // Un club nuestro (ID estable) lo es con cualquier nombre: A/B, renombrados...
  const ourClubIds = new Set(
    teams.filter((t) => t.is_our_club && t.club_id !== null).map((t) => t.club_id)
  );
  for (const t of teams) if (t.club_id !== null && ourClubIds.has(t.club_id)) t.is_our_club = true;
  const teamIds = new Set(teams.map((x) => x.id));

  // Un club puede tener varios equipos en el torneo (A/B): nos quedamos con el nombre más corto.
  const clubByName = new Map<number, string>();
  for (const t of teams) {
    if (t.club_id === null) continue;
    const prev = clubByName.get(t.club_id);
    if (prev === undefined || t.name.length < prev.length) clubByName.set(t.club_id, t.name);
  }
  const clubs: FedClubRow[] = [...clubByName].map(([id, name]) => ({ id, name, last_season: season }));

  const facilities: FedFacilityRow[] = all("facility").map((f) => ({
    id: Number(f.id),
    name: (str(f.attributes?.name) ?? `Pabellón ${f.id}`).trim(),
  }));

  // Resultados indexados por id (los de partido y los de set comparten tipo)
  const results = byType.get("result") ?? new Map<string, JsonApiResource>();
  const periods = byType.get("period") ?? new Map<string, JsonApiResource>();
  const resultsByPeriod = new Map<string, JsonApiResource[]>();
  for (const r of results.values()) {
    const pid = relId(r, "period");
    if (!pid) continue;
    if (!resultsByPeriod.has(pid)) resultsByPeriod.set(pid, []);
    resultsByPeriod.get(pid)!.push(r);
  }

  const matches: FedMatchRow[] = [];
  const sets: FedMatchSetRow[] = [];

  for (const m of all("match")) {
    const roundId = relId(m, "round");
    const groupId = roundId ? roundGroup.get(roundId) : undefined;
    if (!groupId) continue; // partido fuera de este torneo

    const homeRaw = str(m.meta?.home_team);
    const awayRaw = str(m.meta?.away_team);
    const home = homeRaw && teamIds.has(Number(homeRaw)) ? Number(homeRaw) : null;
    const away = awayRaw && teamIds.has(Number(awayRaw)) ? Number(awayRaw) : null;

    // Resultado final: result sin periodo → value = sets, score = puntos de liga
    let homeSets: number | null = null;
    let awaySets: number | null = null;
    let homePts: number | null = null;
    let awayPts: number | null = null;
    for (const rid of relIds(m, "results")) {
      const r = results.get(rid);
      if (!r || relId(r, "period")) continue;
      const team = relId(r, "team");
      if (team === homeRaw) {
        homeSets = int(r.attributes?.value);
        homePts = int(r.attributes?.score);
      } else if (team === awayRaw) {
        awaySets = int(r.attributes?.value);
        awayPts = int(r.attributes?.score);
      }
    }

    const { date, time } = splitDateTime(m.attributes?.datetime ?? m.attributes?.date);
    const finished = bool(m.attributes?.finished);
    const matchId = Number(m.id);

    matches.push({
      id: matchId,
      tournament_id: tournamentId,
      group_id: Number(groupId),
      round_id: Number(roundId),
      home_team_id: home,
      away_team_id: away,
      facility_id: int(relId(m, "facility")),
      local_date: date,
      local_time: time,
      timezone: str(m.attributes?.display_timezone) ?? "Atlantic/Canary",
      finished,
      canceled: bool(m.attributes?.canceled),
      postponed: bool(m.attributes?.postponed),
      rest: bool(m.attributes?.rest),
      home_sets: finished ? homeSets : null,
      away_sets: finished ? awaySets : null,
      home_league_points: finished ? homePts : null,
      away_league_points: finished ? awayPts : null,
      report_url: str(m.attributes?.report),
      fed_updated_at: auditTimestamp(m.attributes?.updated_at),
    });

    if (!finished) continue;

    // Puntos por set: periodo (order = nº de set) → results con team
    const matchSets: FedMatchSetRow[] = [];
    for (const pid of relIds(m, "periods")) {
      const p = periods.get(pid);
      const setNumber = int(p?.attributes?.order);
      if (!p || !setNumber || setNumber < 1 || setNumber > 5) continue;
      let hp: number | null = null;
      let ap: number | null = null;
      for (const r of resultsByPeriod.get(pid) ?? []) {
        const team = relId(r, "team");
        if (team === homeRaw) hp = int(r.attributes?.value);
        else if (team === awayRaw) ap = int(r.attributes?.value);
      }
      // Sets no jugados (p. ej. 3-0 con tie-break vacío) vienen a null / 0-0
      if (hp === null || ap === null || hp + ap === 0) continue;
      matchSets.push({ match_id: matchId, set_number: setNumber, home_points: hp, away_points: ap });
    }
    sets.push(...matchSets.sort((a, b) => a.set_number - b.set_number));
  }

  return { tournament, groups, rounds, teams, clubs, facilities, matches, sets };
}
