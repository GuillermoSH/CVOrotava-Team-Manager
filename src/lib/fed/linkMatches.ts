import type { SupabaseClient } from "@supabase/supabase-js";
import { canLearnVenueAlias, findVenueByName, isPlaceholderVenueName } from "@/lib/venues/venueNames";
import { opponentDistance, planMatchLinks, prettyTeamName, type FedOurMatch } from "./linkPlan";

/**
 * Vuelca los partidos de nuestros equipos (fed_*) a `matches` / `match_sets`.
 *
 * Dueño de cada campo en partidos enlazados:
 *  - Federación: date, time, season, gender, venue_id, result y sets
 *    (result/sets solo si la federación los tiene: nunca se borra uno nuestro).
 *  - Nosotros: opponent (nombre ya curado), video_url, notes.
 */

export type LinkSummary = {
  linked: number;
  created: number;
  updated: number;
  newVenues: string[];
  /** Solo en dryRun: qué se haría. */
  preview?: {
    links: { fedId: number; fedDate: string; fedOpponent: string; ourDate: string; ourOpponent: string }[];
    creates: { fedId: number; date: string; opponent: string; season: string; gender: string }[];
  };
};

type FedRow = {
  id: number;
  tournament_id: number;
  group_id: number;
  home_team_id: number | null;
  away_team_id: number | null;
  facility_id: number | null;
  local_date: string | null;
  local_time: string | null;
  finished: boolean;
  canceled: boolean;
  rest: boolean;
  home_sets: number | null;
  away_sets: number | null;
  fed_match_sets: { set_number: number; home_points: number; away_points: number }[];
};

type OurRow = {
  id: string;
  date: string;
  time: string;
  opponent: string;
  season: string;
  gender: string;
  result: string | null;
  venue_id: string | null;
  fed_match_id: number | null;
  match_sets: { set_number: number; team_score: number; opponent_score: number }[];
};

type Target = {
  fedId: number;
  date: string;
  time: string;
  season: string;
  gender: "male" | "female";
  opponent: string;
  /** Otros nombres del club rival en otras temporadas. */
  opponentAliases: string[];
  /** Nombre más reciente del club rival (para los partidos que creamos). */
  opponentCanonical: string | null;
  facilityId: number | null;
  ourIsHome: boolean;
  homeTeamName: string;
  /** Nombres del club local (decide a qué venue pertenece un pabellón nuevo). */
  homeAliases: string[];
  homeCanonical: string | null;
  result: string | null;
  sets: { set_number: number; team_score: number; opponent_score: number }[];
};

export async function linkOurMatches(
  supabase: SupabaseClient,
  tournamentIds: number[],
  { dryRun = false }: { dryRun?: boolean } = {}
): Promise<LinkSummary> {
  const summary: LinkSummary = { linked: 0, created: 0, updated: 0, newVenues: [] };
  if (tournamentIds.length === 0) return summary;

  const [{ data: tournaments, error: tErr }, { data: groups, error: gErr }, { data: teams, error: teErr }] =
    await Promise.all([
      supabase.from("fed_tournaments").select("id, season, gender").in("id", tournamentIds),
      supabase.from("fed_groups").select("id, gender").in("tournament_id", tournamentIds),
      supabase.from("fed_teams").select("id, name, is_our_club, club_id").in("tournament_id", tournamentIds),
    ]);
  if (tErr || gErr || teErr) throw new Error((tErr ?? gErr ?? teErr)!.message);

  const ourTeamIds = (teams ?? []).filter((t) => t.is_our_club).map((t) => t.id as number);
  if (ourTeamIds.length === 0) return summary;
  const teamName = new Map((teams ?? []).map((t) => [t.id as number, t.name as string]));
  const tournamentById = new Map((tournaments ?? []).map((t) => [t.id as number, t]));
  const groupGender = new Map((groups ?? []).map((g) => [g.id as number, g.gender as string | null]));
  const ours = new Set(ourTeamIds);
  const clubOfTeam = new Map((teams ?? []).map((t) => [t.id as number, (t.club_id as number | null) ?? null]));

  const fedRows: FedRow[] = [];
  for (const tid of tournamentIds) {
    const { data, error } = await supabase
      .from("fed_matches")
      .select(
        "id, tournament_id, group_id, home_team_id, away_team_id, facility_id, local_date, local_time, finished, canceled, rest, home_sets, away_sets, fed_match_sets(set_number, home_points, away_points)"
      )
      .eq("tournament_id", tid)
      .or(`home_team_id.in.(${ourTeamIds.join(",")}),away_team_id.in.(${ourTeamIds.join(",")})`);
    if (error) throw new Error(`fed_matches: ${error.message}`);
    fedRows.push(...((data ?? []) as FedRow[]));
  }

  const clubNames = await loadClubNames(
    supabase,
    [...new Set([...clubOfTeam.values()].filter((c): c is number => c !== null))]
  );
  const namesOf = (teamId: number) => {
    const club = clubOfTeam.get(teamId);
    return {
      aliases: club ? clubNames.names.get(club) ?? [] : [],
      canonical: club ? clubNames.canonical.get(club) ?? null : null,
    };
  };

  // Vista "nuestra" de cada partido federado jugable
  const targets: Target[] = [];
  for (const m of fedRows) {
    if (m.canceled || m.rest || !m.local_date || !m.local_time) continue;
    if (m.home_team_id === null || m.away_team_id === null) continue;
    const t = tournamentById.get(m.tournament_id);
    const gender = (groupGender.get(m.group_id) ?? t?.gender) as string | undefined;
    if (!t || (gender !== "male" && gender !== "female")) continue;

    const ourIsHome = ours.has(m.home_team_id);
    const rivalId = ourIsHome ? m.away_team_id : m.home_team_id;
    const hasResult = m.finished && m.home_sets !== null && m.away_sets !== null;
    const ourSets = ourIsHome ? m.home_sets : m.away_sets;
    const rivalSets = ourIsHome ? m.away_sets : m.home_sets;

    targets.push({
      fedId: m.id,
      date: m.local_date,
      time: m.local_time,
      season: t.season as string,
      gender,
      opponent: teamName.get(rivalId) ?? "Rival",
      opponentAliases: namesOf(rivalId).aliases,
      opponentCanonical: namesOf(rivalId).canonical,
      facilityId: m.facility_id,
      ourIsHome,
      homeTeamName: teamName.get(m.home_team_id) ?? "",
      homeAliases: namesOf(m.home_team_id).aliases,
      homeCanonical: namesOf(m.home_team_id).canonical,
      result: hasResult ? `${ourSets}-${rivalSets}` : null,
      sets: [...m.fed_match_sets]
        .sort((a, b) => a.set_number - b.set_number)
        .map((s) => ({
          set_number: s.set_number,
          team_score: ourIsHome ? s.home_points : s.away_points,
          opponent_score: ourIsHome ? s.away_points : s.home_points,
        })),
    });
  }

  const seasons = [...new Set(targets.map((t) => t.season))];
  if (seasons.length === 0) return summary;

  const { data: ourData, error: oErr } = await supabase
    .from("matches")
    .select(
      "id, date, time, opponent, season, gender, result, venue_id, fed_match_id, match_sets(set_number, team_score, opponent_score)"
    )
    .in("season", seasons);
  if (oErr) throw new Error(`matches: ${oErr.message}`);
  const ourRows = (ourData ?? []) as OurRow[];
  const ourById = new Map(ourRows.map((o) => [o.id, o]));

  // Emparejar por temporada + género
  const linkedPairs: { t: Target; o: OurRow }[] = [];
  const toCreate: Target[] = [];
  for (const season of seasons) {
    for (const gender of ["male", "female"] as const) {
      const fedSide = targets.filter((t) => t.season === season && t.gender === gender);
      if (fedSide.length === 0) continue;
      const ourSide = ourRows.filter((o) => o.season === season && o.gender === gender);
      const plan = planMatchLinks(
        fedSide.map((t): FedOurMatch => ({ fedId: t.fedId, date: t.date, opponent: t.opponent, opponentAliases: t.opponentAliases })),
        ourSide
      );
      for (const t of fedSide) {
        const ourId = plan.links.get(t.fedId);
        if (ourId) linkedPairs.push({ t, o: ourById.get(ourId)! });
        else toCreate.push(t);
      }
    }
  }

  if (dryRun) {
    summary.linked = linkedPairs.length;
    summary.created = toCreate.length;
    summary.preview = {
      links: linkedPairs.map(({ t, o }) => ({
        fedId: t.fedId,
        fedDate: t.date,
        fedOpponent: t.opponent,
        ourDate: o.date,
        ourOpponent: o.opponent,
      })),
      creates: toCreate.map((t) => ({
        fedId: t.fedId,
        date: t.date,
        opponent: t.opponent,
        season: t.season,
        gender: t.gender,
      })),
    };
    return summary;
  }

  const venues = await venueResolver(supabase, summary);

  // Los pabellones que ya teníamos asignados enseñan la correspondencia
  // federación → venue (conserva nuestra clasificación casa/fuera/viaje).
  for (const { t, o } of linkedPairs) {
    if (t.facilityId && o.venue_id) await venues.learn(t.facilityId, o.venue_id);
  }

  for (const { t, o } of linkedPairs) {
    summary.linked++;
    const venueId = t.facilityId ? await venues.resolve(t.facilityId, t.ourIsHome, t) : null;
    const patch: Record<string, unknown> = {};
    if (o.fed_match_id !== t.fedId) patch.fed_match_id = t.fedId;
    if (o.date !== t.date) patch.date = t.date;
    if (o.time?.slice(0, 5) !== t.time.slice(0, 5)) patch.time = t.time;
    if (o.season !== t.season) patch.season = t.season;
    if (venueId && o.venue_id !== venueId) patch.venue_id = venueId;
    if (t.result && o.result !== t.result) patch.result = t.result;

    const setsChanged = t.sets.length > 0 && !sameSets(o.match_sets, t.sets);
    if (Object.keys(patch).length > 0) {
      const { error } = await supabase.from("matches").update(patch).eq("id", o.id);
      if (error) throw new Error(`matches update ${o.id}: ${error.message}`);
    }
    if (setsChanged) await replaceSets(supabase, o.id, t.sets);
    if (Object.keys(patch).length > 0 || setsChanged) summary.updated++;
  }

  for (const t of toCreate) {
    const venueId = t.facilityId ? await venues.resolve(t.facilityId, t.ourIsHome, t) : null;
    const { data: created, error } = await supabase
      .from("matches")
      .insert({
        date: t.date,
        time: t.time,
        opponent: prettyTeamName(t.opponentCanonical ?? t.opponent),
        season: t.season,
        gender: t.gender,
        result: t.result,
        venue_id: venueId,
        fed_match_id: t.fedId,
      })
      .select("id")
      .single();
    if (error) throw new Error(`matches insert fed ${t.fedId}: ${error.message}`);
    if (t.sets.length > 0) await replaceSets(supabase, created.id as string, t.sets);
    summary.created++;
  }

  return summary;
}

function sameSets(a: OurRow["match_sets"], b: Target["sets"]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x.set_number - y.set_number);
  return sa.every(
    (s, i) =>
      s.set_number === b[i].set_number &&
      s.team_score === b[i].team_score &&
      s.opponent_score === b[i].opponent_score
  );
}

async function replaceSets(supabase: SupabaseClient, matchId: string, sets: Target["sets"]) {
  const { error: dErr } = await supabase.from("match_sets").delete().eq("match_id", matchId);
  if (dErr) throw new Error(`match_sets delete ${matchId}: ${dErr.message}`);
  const { error } = await supabase
    .from("match_sets")
    .insert(sets.map((s) => ({ ...s, match_id: matchId })));
  if (error) throw new Error(`match_sets insert ${matchId}: ${error.message}`);
}

/**
 * Pabellón federado → `venues.id`. Orden: alias guardado → mismo sitio por
 * nombre (sin ambigüedad) → alta nueva marcada `needs_review`.
 * Cada resolución guarda un alias en `venue_fed_facilities` (varios pabellones
 * federados pueden apuntar al mismo venue).
 */
async function venueResolver(supabase: SupabaseClient, summary: LinkSummary) {
  const [{ data: venues, error }, { data: aliases, error: aErr }, { data: facilities, error: fErr }] =
    await Promise.all([
      supabase.from("venues").select("id, venue_name, team_name"),
      supabase.from("venue_fed_facilities").select("fed_facility_id, venue_id"),
      supabase.from("fed_facilities").select("id, name"),
    ]);
  if (error || aErr || fErr) throw new Error(`venues: ${(error ?? aErr ?? fErr)!.message}`);

  const known: { id: string; venue_name: string; team_name: string | null }[] = (venues ?? []).map((v) => ({
    id: v.id as string,
    venue_name: v.venue_name as string,
    team_name: (v.team_name as string | null) ?? null,
  }));
  const byFacility = new Map((aliases ?? []).map((a) => [a.fed_facility_id as number, a.venue_id as string]));
  const facilityName = new Map((facilities ?? []).map((f) => [f.id as number, f.name as string]));

  const addAlias = async (facilityId: number, venueId: string) => {
    const { error: iErr } = await supabase
      .from("venue_fed_facilities")
      .upsert({ fed_facility_id: facilityId, venue_id: venueId }, { onConflict: "fed_facility_id" });
    if (iErr) throw new Error(`venue alias: ${iErr.message}`);
    byFacility.set(facilityId, venueId);
  };

  /** El venue que ya tenía nuestro partido enlazado enseña la correspondencia (si los nombres encajan). */
  const learn = async (facilityId: number, venueId: string) => {
    if (byFacility.has(facilityId)) return;
    const name = facilityName.get(facilityId);
    const venue = known.find((k) => k.id === venueId);
    if (!name || !venue || !canLearnVenueAlias(name, venue.venue_name)) return;
    await addAlias(facilityId, venueId);
  };

  const resolve = async (
    facilityId: number,
    ourIsHome: boolean,
    home: Pick<Target, "homeTeamName" | "homeAliases" | "homeCanonical">
  ): Promise<string | null> => {
    const name = facilityName.get(facilityId);
    if (!name || isPlaceholderVenueName(name)) return null;

    const aliased = byFacility.get(facilityId);
    if (aliased) return aliased;

    const homeNames = [home.homeTeamName, home.homeCanonical ?? "", ...home.homeAliases].filter(Boolean);
    const sameSite = findVenueByName(name, known, (team) => homeNames.some((n) => opponentDistance(team, n) !== null));
    if (sameSite) {
      await addAlias(facilityId, sameSite.id);
      return sameSite.id;
    }

    const teamName = prettyTeamName(home.homeCanonical ?? home.homeTeamName) || name;
    const { data: created, error: cErr } = await supabase
      .from("venues")
      .insert({
        venue_name: name,
        team_name: teamName,
        location_type: ourIsHome ? "home" : "away",
        needs_review: true,
      })
      .select("id")
      .single();
    if (cErr) throw new Error(`venues insert: ${cErr.message}`);
    const id = created.id as string;
    known.push({ id, venue_name: name, team_name: teamName });
    await addAlias(facilityId, id);
    summary.newVenues.push(name);
    return id;
  };

  return { learn, resolve };
}

/** Todos los nombres con que la federación ha llamado a cada club + el más reciente. */
async function loadClubNames(supabase: SupabaseClient, clubIds: number[]) {
  const names = new Map<number, string[]>();
  const canonical = new Map<number, string>();
  for (let i = 0; i < clubIds.length; i += 100) {
    const chunk = clubIds.slice(i, i + 100);
    const { data: clubs, error } = await supabase.from("fed_clubs").select("id, name").in("id", chunk);
    if (error) throw new Error(`fed_clubs: ${error.message}`);
    for (const c of clubs ?? []) canonical.set(c.id as number, c.name as string);

    for (let from = 0; ; from += 1000) {
      const { data, error: tErr } = await supabase
        .from("fed_teams")
        .select("name, club_id")
        .in("club_id", chunk)
        .range(from, from + 999);
      if (tErr) throw new Error(`fed_teams by club: ${tErr.message}`);
      for (const t of data ?? []) {
        const list = names.get(t.club_id as number) ?? [];
        if (!list.includes(t.name as string)) list.push(t.name as string);
        names.set(t.club_id as number, list);
      }
      if ((data ?? []).length < 1000) break;
    }
  }
  return { names, canonical };
}
