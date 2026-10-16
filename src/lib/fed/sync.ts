import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentSeason } from "@/utils/getCurrentSeason";
import { FCVB_MANAGER_ID, leveradeGet } from "./client";
import { linkOurMatches, type LinkSummary } from "./linkMatches";
import {
  FIRST_SYNCED_SEASON,
  TOURNAMENT_INCLUDES,
  isSeniorIndoorTournament,
  parseTournamentBundle,
  seasonFromText,
  type FedTournamentBundle,
} from "./parse";

export type FedSyncScope =
  | { kind: "current" }
  | { kind: "all" }
  | { kind: "seasons"; seasons: string[] };

export type FedSyncTrigger = "cron" | "manual" | "backfill";

export type FedSyncSummary = {
  scope: FedSyncScope;
  tournaments: {
    id: number;
    name: string;
    season: string;
    matches: number;
    finished: number;
    sets: number;
  }[];
  skipped: { id: number; name: string; reason: string }[];
  /** Volcado a `matches` (solo si no es dry-run). */
  link?: LinkSummary;
};

type Candidate = { id: string; name: string };

function seasonRange(scope: FedSyncScope): { min: string; max: string; only?: Set<string> } {
  const current = getCurrentSeason();
  if (scope.kind === "current") return { min: current, max: current };
  if (scope.kind === "seasons") {
    const sorted = [...scope.seasons].sort();
    return { min: sorted[0], max: sorted[sorted.length - 1], only: new Set(sorted) };
  }
  return { min: FIRST_SYNCED_SEASON, max: current };
}

/**
 * Torneos sénior de pista de la FCVB, del más nuevo al más antiguo.
 * Para de paginar cuando una página entera es anterior a `minSeason`.
 */
async function discoverCandidates(minSeason: string): Promise<Candidate[]> {
  const out: Candidate[] = [];
  for (let page = 1; page <= 50; page++) {
    const doc = await leveradeGet(
      `tournaments?filter=manager.id:${FCVB_MANAGER_ID}&sort=-id&page[size]=100&page[number]=${page}`
    );
    const items = Array.isArray(doc.data) ? doc.data : [doc.data];

    let anyInRange = false;
    for (const t of items) {
      const name = String(t.attributes?.name ?? "");
      const season = seasonFromText(name);
      // Sin temporada en el nombre ("... 21/22", "... 2022") → se decide tras descargar.
      if (!season || season >= minSeason) anyInRange = true;
      if (isSeniorIndoorTournament(name) && (!season || season >= minSeason)) {
        out.push({ id: t.id, name });
      }
    }
    if (items.length < 100 || !anyInRange) break;
  }
  return out;
}

const CHUNK = 500;

async function upsertChunks(
  supabase: SupabaseClient,
  table: string,
  rows: object[],
  onConflict: string
) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabase
      .from(table)
      .upsert(rows.slice(i, i + CHUNK), { onConflict });
    if (error) throw new Error(`${table} upsert: ${error.message}`);
  }
}

/** Borra filas del torneo que ya no existen en Leverade (calendarios regenerados). */
async function pruneMissing(
  supabase: SupabaseClient,
  table: string,
  scopeColumn: string,
  scopeIds: number[],
  keepIds: number[]
) {
  if (scopeIds.length === 0) return;
  let q = supabase.from(table).delete().in(scopeColumn, scopeIds);
  if (keepIds.length > 0) q = q.not("id", "in", `(${keepIds.join(",")})`);
  const { error } = await q;
  if (error) throw new Error(`${table} prune: ${error.message}`);
}

/**
 * Un club con algún equipo nuestro (detectado por nombre) lo es en todas sus
 * temporadas, aunque la federación lo renombre. El club puede cambiar de ID
 * (el masculino pasó de Voleypuerto a Orotava): todos los IDs con equipos
 * nuestros cuentan.
 */
async function markOurClubTeams(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("fed_teams")
    .select("club_id")
    .eq("is_our_club", true)
    .not("club_id", "is", null);
  if (error) throw new Error(`fed_teams ours: ${error.message}`);
  const ids = [...new Set((data ?? []).map((t) => t.club_id as number))];
  if (ids.length === 0) return;
  const { error: uErr } = await supabase
    .from("fed_teams")
    .update({ is_our_club: true })
    .in("club_id", ids)
    .eq("is_our_club", false);
  if (uErr) throw new Error(`fed_teams mark ours: ${uErr.message}`);
}

/**
 * Clubes antes que equipos (FK). Un club conserva el nombre de su temporada más
 * reciente: sincronizar una temporada antigua no pisa el nombre actual.
 */
async function upsertClubs(supabase: SupabaseClient, b: FedTournamentBundle, now: string) {
  if (b.clubs.length === 0) return;
  const { data, error } = await supabase
    .from("fed_clubs")
    .select("id, last_season")
    .in("id", b.clubs.map((c) => c.id));
  if (error) throw new Error(`fed_clubs select: ${error.message}`);
  const known = new Map((data ?? []).map((c) => [c.id as number, c.last_season as string]));
  const rows = b.clubs
    .filter((c) => !known.has(c.id) || c.last_season >= known.get(c.id)!)
    .map((c) => ({ ...c, synced_at: now }));
  await upsertChunks(supabase, "fed_clubs", rows, "id");
}

export async function writeTournamentBundle(
  supabase: SupabaseClient,
  b: FedTournamentBundle
) {
  const now = new Date().toISOString();
  const stamp = <T extends object>(rows: T[]) => rows.map((r) => ({ ...r, synced_at: now }));

  // Orden por FKs: torneo → grupos/equipos/pabellones → jornadas → partidos → sets
  await upsertChunks(supabase, "fed_tournaments", stamp([b.tournament]), "id");
  await upsertChunks(supabase, "fed_groups", stamp(b.groups), "id");
  await upsertClubs(supabase, b, now);
  await upsertChunks(supabase, "fed_teams", stamp(b.teams), "id");
  await markOurClubTeams(supabase);
  // Sin location_type en el payload → no pisa la clasificación manual.
  await upsertChunks(supabase, "fed_facilities", stamp(b.facilities), "id");
  await upsertChunks(supabase, "fed_rounds", stamp(b.rounds), "id");
  await upsertChunks(supabase, "fed_matches", stamp(b.matches), "id");

  // Sets: reemplazo completo de los partidos terminados (un acta corregida puede quitar sets).
  const finishedIds = b.matches.filter((m) => m.finished).map((m) => m.id);
  for (let i = 0; i < finishedIds.length; i += CHUNK) {
    const { error } = await supabase
      .from("fed_match_sets")
      .delete()
      .in("match_id", finishedIds.slice(i, i + CHUNK));
    if (error) throw new Error(`fed_match_sets delete: ${error.message}`);
  }
  for (let i = 0; i < b.sets.length; i += CHUNK) {
    const { error } = await supabase.from("fed_match_sets").insert(b.sets.slice(i, i + CHUNK));
    if (error) throw new Error(`fed_match_sets insert: ${error.message}`);
  }

  const tid = [b.tournament.id];
  await pruneMissing(supabase, "fed_matches", "tournament_id", tid, b.matches.map((m) => m.id));
  await pruneMissing(supabase, "fed_rounds", "group_id", b.groups.map((g) => g.id), b.rounds.map((r) => r.id));
  await pruneMissing(supabase, "fed_groups", "tournament_id", tid, b.groups.map((g) => g.id));
  await pruneMissing(supabase, "fed_teams", "tournament_id", tid, b.teams.map((t) => t.id));
}

export async function syncFed(opts: {
  supabase: SupabaseClient;
  scope: FedSyncScope;
  trigger: FedSyncTrigger;
  dryRun?: boolean;
  log?: (msg: string) => void;
}): Promise<FedSyncSummary> {
  const { supabase, scope, trigger, dryRun = false, log = () => {} } = opts;
  const range = seasonRange(scope);
  const summary: FedSyncSummary = { scope, tournaments: [], skipped: [] };

  let runId: number | null = null;
  if (!dryRun) {
    const { data, error } = await supabase
      .from("fed_sync_runs")
      .insert({ trigger })
      .select("id")
      .single();
    if (error) throw new Error(`fed_sync_runs insert: ${error.message}`);
    runId = data.id as number;
  }

  try {
    const candidates = await discoverCandidates(range.min);
    log(`${candidates.length} torneos sénior candidatos (desde ${range.min})`);

    // Secuencial: la API limita ráfagas (429) y cada torneo es una petición grande.
    for (const c of candidates) {
      const doc = await leveradeGet(`tournaments/${c.id}?include=${TOURNAMENT_INCLUDES}`);
      const bundle = parseTournamentBundle(doc);
      const { tournament: t } = bundle;

      const inRange = range.only
        ? range.only.has(t.season)
        : t.season >= range.min && t.season <= range.max;
      if (!inRange) {
        summary.skipped.push({ id: t.id, name: t.name, reason: `season ${t.season}` });
        continue;
      }
      if (!bundle.teams.some((x) => x.is_our_club)) {
        summary.skipped.push({ id: t.id, name: t.name, reason: "club no inscrito" });
        continue;
      }

      if (!dryRun) await writeTournamentBundle(supabase, bundle);

      const entry = {
        id: t.id,
        name: t.name,
        season: t.season,
        matches: bundle.matches.length,
        finished: bundle.matches.filter((m) => m.finished).length,
        sets: bundle.sets.length,
      };
      summary.tournaments.push(entry);
      log(`✓ ${t.season} ${t.name}: ${entry.matches} partidos (${entry.finished} jugados), ${entry.sets} sets`);
    }

    if (!dryRun) {
      summary.link = await linkOurMatches(
        supabase,
        summary.tournaments.map((t) => t.id)
      );
      log(
        `→ matches: ${summary.link.linked} enlazados (${summary.link.updated} actualizados), ` +
          `${summary.link.created} creados, ${summary.link.newVenues.length} pabellones nuevos`
      );
    }

    if (runId !== null) {
      await supabase
        .from("fed_sync_runs")
        .update({ finished_at: new Date().toISOString(), ok: true, summary })
        .eq("id", runId);
    }
    return summary;
  } catch (err) {
    if (runId !== null) {
      await supabase
        .from("fed_sync_runs")
        .update({
          finished_at: new Date().toISOString(),
          ok: false,
          summary,
          error: err instanceof Error ? err.message : String(err),
        })
        .eq("id", runId);
    }
    throw err;
  }
}

