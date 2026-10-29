import type { SupabaseClient } from "@supabase/supabase-js";
import { isTrustedReportUrl } from "../reportUrl";
import { readActaItems } from "./items";
import { parseActa } from "./parse";
import { RETRY_CODES, failedReportRow, reportRows, saveReport, type ReportRows, type ReportStatus } from "./store";
import { ACTA_PARSER_VERSION, type ActaIssue, type ActaItem } from "./types";
import { actaStatus, compareWithFed, validateActa, type FedMatchForActa } from "./validate";

/**
 * De los partidos terminados de la federación con acta, los que aún no tienen acta leída (o la tienen
 * con una versión antigua del extractor o a medias) → descargar → leer → validar → guardar.
 */

/** Las actas con datos empiezan en la 2025-26; antes el enlace del acta no existe. */
export const FIRST_ACTA_SEASON = "2025-26";

const MAX_PDF_BYTES = 5 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 30_000;

export type PendingMatch = FedMatchForActa & { id: number; reportUrl: string };

export type ProcessDeps = {
  download: (url: string) => Promise<Uint8Array>;
  readItems: (pdf: Uint8Array) => Promise<ActaItem[]>;
};

/** Descarga el PDF del acta: solo del dominio de la federación, que sea PDF y de tamaño razonable. */
export async function downloadActa(url: string): Promise<Uint8Array> {
  if (!isTrustedReportUrl(url)) throw new Error("Enlace de acta que no es de la federación.");
  const res = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS), cache: "no-store" });
  if (!res.ok) throw new Error(`La federación responde ${res.status}.`);
  if (!(res.headers.get("content-type") ?? "").includes("pdf")) throw new Error("La respuesta de la federación no es un PDF.");
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength > MAX_PDF_BYTES) throw new Error("El PDF del acta es demasiado grande.");
  return buf;
}

export const defaultDeps: ProcessDeps = { download: downloadActa, readItems: readActaItems };

export type ProcessOutcome = {
  matchId: number;
  status: ReportStatus | "retry";
  issues: ActaIssue[];
  rows: ReportRows | null;
  failed: Record<string, unknown> | null;
};

/** Procesa un partido: descarga, lee, valida y contrasta con la federación. No escribe nada. */
export async function processMatch(match: PendingMatch, deps: ProcessDeps = defaultDeps): Promise<ProcessOutcome> {
  let items: ActaItem[];
  try {
    items = await deps.readItems(await deps.download(match.reportUrl));
  } catch (e) {
    // Un fallo de descarga o de lectura del PDF puede ser pasajero: se reintenta en la siguiente pasada
    const issues: ActaIssue[] = [{ level: "error", code: RETRY_CODES.download, message: e instanceof Error ? e.message : String(e) }];
    return { matchId: match.id, status: "retry", issues, rows: null, failed: failedReportRow(match.id, issues) };
  }

  const parsed = parseActa(items);
  if (!parsed.data) {
    return { matchId: match.id, status: "failed", issues: parsed.issues, rows: null, failed: failedReportRow(match.id, parsed.issues) };
  }

  const cmp = compareWithFed(parsed.data, match);
  const issues = [...parsed.issues, ...validateActa(parsed.data), ...cmp.issues];
  const status = actaStatus(issues);
  if (cmp.homeSide === null || status === "failed") {
    // No coincide con el partido o no se fía de la lectura: se anota y no se guardan datos
    return { matchId: match.id, status: "failed", issues, rows: null, failed: failedReportRow(match.id, issues) };
  }
  return { matchId: match.id, status, issues, rows: reportRows(match.id, parsed.data, cmp.homeSide, status, issues), failed: null };
}

// ─── Selección de pendientes ───────────────────────────────────

type MatchRow = {
  id: number;
  tournament_id: number;
  home_team_id: number | null;
  away_team_id: number | null;
  home_sets: number | null;
  away_sets: number | null;
  report_url: string | null;
};

async function chunked<R>(ids: number[], size: number, run: (chunk: number[]) => PromiseLike<{ data: R[] | null; error: { message: string } | null }>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < ids.length; i += size) {
    const { data, error } = await run(ids.slice(i, i + size));
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
  }
  return out;
}

export type PendingOptions = {
  /** Cuántos como máximo; los más recientes primero. */
  limit?: number;
  /** Solo estas temporadas (YYYY-YY); por defecto, todas desde la primera con actas. */
  seasons?: string[];
  /** Reprocesar también las ya leídas con la versión actual del extractor. */
  force?: boolean;
};

/** Partidos terminados con acta cuya lectura falta, está a medias o es de una versión antigua. */
export async function loadPending(supabase: SupabaseClient, opts: PendingOptions = {}): Promise<PendingMatch[]> {
  const { data: tournaments, error: tErr } = await supabase.from("fed_tournaments").select("id, season");
  if (tErr) throw new Error(`fed_tournaments: ${tErr.message}`);
  const allowed = new Set(
    (tournaments ?? [])
      .filter((t) => (opts.seasons ? opts.seasons.includes(t.season as string) : (t.season as string) >= FIRST_ACTA_SEASON))
      .map((t) => t.id as number)
  );
  if (allowed.size === 0) return [];

  const matches: (MatchRow & { local_date: string | null })[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("fed_matches")
      .select("id, tournament_id, home_team_id, away_team_id, home_sets, away_sets, report_url, local_date")
      .eq("finished", true)
      .not("report_url", "is", null)
      .order("local_date", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + 999);
    if (error) throw new Error(`fed_matches: ${error.message}`);
    matches.push(...((data ?? []) as (MatchRow & { local_date: string | null })[]));
    if ((data ?? []).length < 1000) break;
  }
  // Los más recientes primero (aunque la base ya los entregue así, el orden no se da por supuesto)
  const candidates = matches
    .filter((m) => allowed.has(m.tournament_id) && m.home_team_id !== null && m.away_team_id !== null && m.report_url)
    .sort((a, b) => (b.local_date ?? "").localeCompare(a.local_date ?? "") || b.id - a.id);

  const done = new Map<number, { parser_version: number; retry: boolean }>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("fed_match_reports").select("match_id, parser_version, status, issues").range(from, from + 999);
    if (error) throw new Error(`fed_match_reports: ${error.message}`);
    for (const r of data ?? []) {
      const issues = (r.issues as ActaIssue[] | null) ?? [];
      done.set(r.match_id as number, {
        parser_version: r.parser_version as number,
        retry: r.status === "failed" && issues.some((i) => i.code === RETRY_CODES.download || i.code === RETRY_CODES.incompleteSave),
      });
    }
    if ((data ?? []).length < 1000) break;
  }

  const pending = candidates.filter((m) => {
    const d = done.get(m.id);
    return opts.force || !d || d.parser_version < ACTA_PARSER_VERSION || d.retry;
  });
  const chosen = pending.slice(0, opts.limit ?? pending.length);
  if (chosen.length === 0) return [];

  const teamIds = [...new Set(chosen.flatMap((m) => [m.home_team_id as number, m.away_team_id as number]))];
  const teams = new Map(
    (await chunked<{ id: number; name: string }>(teamIds, 200, (c) => supabase.from("fed_teams").select("id, name").in("id", c))).map((t) => [t.id, t.name])
  );
  const sets = await chunked<{ match_id: number; set_number: number; home_points: number; away_points: number }>(
    chosen.map((m) => m.id),
    100,
    (c) => supabase.from("fed_match_sets").select("match_id, set_number, home_points, away_points").in("match_id", c)
  );
  const setsBy = new Map<number, { set_number: number; home: number; away: number }[]>();
  for (const s of sets) setsBy.set(s.match_id, [...(setsBy.get(s.match_id) ?? []), { set_number: s.set_number, home: s.home_points, away: s.away_points }]);

  return chosen.map((m) => ({
    id: m.id,
    reportUrl: m.report_url as string,
    homeName: teams.get(m.home_team_id as number) ?? "",
    awayName: teams.get(m.away_team_id as number) ?? "",
    homeSets: m.home_sets,
    awaySets: m.away_sets,
    sets: (setsBy.get(m.id) ?? []).sort((a, b) => a.set_number - b.set_number).map((s) => ({ home: s.home, away: s.away })),
  }));
}

// ─── Pasada completa ───────────────────────────────────────────

export type ReportsSummary = {
  processed: number;
  ok: number;
  review: number;
  failed: number;
  retry: number;
  /** Pendientes que no han entrado en esta pasada (límite o tiempo). */
  remaining: number;
};

/**
 * Procesa los partidos pendientes, uno a uno (la federación limita las ráfagas), hasta el límite o
 * hasta agotar el tiempo disponible. Nunca lanza por un acta concreta: cada fallo queda anotado en su fila.
 */
export async function processPendingReports(opts: {
  supabase: SupabaseClient;
  limit?: number;
  seasons?: string[];
  force?: boolean;
  /** Milisegundos máximos para empezar actas nuevas. */
  budgetMs?: number;
  dryRun?: boolean;
  log?: (msg: string) => void;
  deps?: ProcessDeps;
}): Promise<ReportsSummary> {
  const { supabase, dryRun = false, log = () => {}, deps = defaultDeps } = opts;
  const started = Date.now();
  const pending = await loadPending(supabase, { limit: opts.limit, seasons: opts.seasons, force: opts.force });
  const summary: ReportsSummary = { processed: 0, ok: 0, review: 0, failed: 0, retry: 0, remaining: 0 };

  for (let i = 0; i < pending.length; i++) {
    if (opts.budgetMs !== undefined && Date.now() - started > opts.budgetMs) {
      summary.remaining = pending.length - i;
      break;
    }
    const outcome = await processMatch(pending[i], deps);
    if (!dryRun) {
      try {
        await saveReport(supabase, outcome.matchId, outcome.rows, outcome.failed);
      } catch (e) {
        log(`✗ ${outcome.matchId}: no se pudo guardar (${e instanceof Error ? e.message : String(e)})`);
        summary.retry++;
        continue;
      }
    }
    summary.processed++;
    summary[outcome.status === "retry" ? "retry" : outcome.status]++;
    if (outcome.status !== "ok") {
      log(`${outcome.status === "failed" || outcome.status === "retry" ? "✗" : "~"} ${outcome.matchId} ${outcome.status}: ${outcome.issues.slice(0, 3).map((x) => x.message).join(" | ")}`);
    }
  }
  return summary;
}
