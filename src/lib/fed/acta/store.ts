import type { SupabaseClient } from "@supabase/supabase-js";
import { ACTA_PARSER_VERSION, type ActaData, type ActaIssue, type Side } from "./types";

/**
 * Del acta ya leída y validada a las tablas `fed_match_reports` y `fed_report_*`.
 * Todo se guarda por local/visitante (`home` / `away`): `homeSide` dice cuál de los equipos del acta
 * (A o B) es el local de la federación.
 */

type Where = "home" | "away";

/** Avisos que piden reprocesar un acta en la siguiente pasada (fallos pasajeros, no del acta). */
export const RETRY_CODES = { download: "download", incompleteSave: "incomplete-save" } as const;

export type ReportRows = {
  report: Record<string, unknown>;
  sets: Record<string, unknown>[];
  timeouts: Record<string, unknown>[];
  substitutions: Record<string, unknown>[];
  players: Record<string, unknown>[];
  staff: Record<string, unknown>[];
  referees: Record<string, unknown>[];
  sanctions: Record<string, unknown>[];
};

export type ReportStatus = "ok" | "review" | "failed";

/** Fila de un acta que no se ha podido leer o no coincide con el partido: sin datos, con sus avisos. */
export function failedReportRow(matchId: number, issues: ActaIssue[]): Record<string, unknown> {
  return {
    match_id: matchId,
    status: "failed" as ReportStatus,
    parser_version: ACTA_PARSER_VERSION,
    parsed_at: new Date().toISOString(),
    issues,
    home_side: null,
  };
}

/** Filas de todas las tablas para un acta leída. */
export function reportRows(matchId: number, data: ActaData, homeSide: Side, status: ReportStatus, issues: ActaIssue[]): ReportRows {
  const where = (s: Side): Where => (s === homeSide ? "home" : "away");
  const awaySide: Side = homeSide === "A" ? "B" : "A";
  const sides: Side[] = ["A", "B"];

  const report = {
    match_id: matchId,
    status,
    parser_version: data.parserVersion,
    parsed_at: new Date().toISOString(),
    issues,
    home_side: homeSide,
    home_name: data.teams[homeSide],
    away_name: data.teams[awaySide],
    start_time: data.totals.start,
    end_time: data.totals.end,
    duration_min: data.totals.durationMin,
    venue: data.venue,
    city: data.city,
    comments: data.comments,
    home_timeouts: data.totals[homeSide].timeouts,
    away_timeouts: data.totals[awaySide].timeouts,
    home_subs: data.totals[homeSide].substitutions,
    away_subs: data.totals[awaySide].substitutions,
  };

  const sets = data.sets.map((s) => ({
    match_id: matchId,
    set_number: s.number,
    start_time: s.start,
    end_time: s.end,
    duration_min: s.durationMin,
    home_points: s.summary[homeSide].points,
    away_points: s.summary[awaySide].points,
    home_timeouts: s.summary[homeSide].timeouts,
    away_timeouts: s.summary[awaySide].timeouts,
    home_subs: s.summary[homeSide].substitutions,
    away_subs: s.summary[awaySide].substitutions,
    home_lineup: s[homeSide].lineup,
    away_lineup: s[awaySide].lineup,
    home_serves_first: s[homeSide].startsServing,
    away_serves_first: s[awaySide].startsServing,
  }));

  const timeouts: Record<string, unknown>[] = [];
  const substitutions: Record<string, unknown>[] = [];
  for (const set of data.sets) {
    for (const side of sides) {
      set[side].timeouts.forEach((t, i) =>
        timeouts.push({ match_id: matchId, set_number: set.number, side: where(side), seq: i + 1, own_points: t.score.own, opp_points: t.score.opp })
      );
      set[side].substitutions.forEach((x, i) =>
        substitutions.push({
          match_id: matchId,
          set_number: set.number,
          side: where(side),
          seq: i + 1,
          position: x.position,
          player_in: x.playerIn,
          in_own: x.scoreIn.own,
          in_opp: x.scoreIn.opp,
          back_own: x.scoreBack?.own ?? null,
          back_opp: x.scoreBack?.opp ?? null,
        })
      );
    }
  }

  const players = sides.flatMap((side) =>
    data.roster[side].map((p) => ({ match_id: matchId, side: where(side), shirt_number: p.number, name: p.name, is_libero: p.libero }))
  );
  const staff = sides.flatMap((side) =>
    data.staff[side].map((p, i) => ({ match_id: matchId, side: where(side), seq: i + 1, role: p.role, name: p.name }))
  );
  const referees = data.referees.map((r, i) => ({ match_id: matchId, seq: i + 1, role: r.role, name: r.name, license: r.license }));
  const sanctions = data.sanctions.map((s, i) => ({
    match_id: matchId,
    seq: i + 1,
    kind: s.kind,
    offender: s.offender,
    side: s.team ? where(s.team) : null,
    set_number: s.set,
    own_points: s.score?.own ?? null,
    opp_points: s.score?.opp ?? null,
  }));

  return { report, sets, timeouts, substitutions, players, staff, referees, sanctions };
}

const CHILD_TABLES = [
  "fed_report_sets",
  "fed_report_timeouts",
  "fed_report_substitutions",
  "fed_report_players",
  "fed_report_staff",
  "fed_report_referees",
  "fed_report_sanctions",
] as const;

async function check(promise: PromiseLike<{ error: { message: string } | null }>, what: string) {
  const { error } = await promise;
  if (error) throw new Error(`${what}: ${error.message}`);
}

/**
 * Guarda un acta: primero la fila del partido (de la que cuelgan las demás), después el reemplazo
 * completo de las tablas hijas. Si algo falla a medias, la fila queda marcada como `failed` para que
 * se reprocese en la siguiente pasada, en vez de dejar un acta a medio guardar como si fuera buena.
 */
export async function saveReport(supabase: SupabaseClient, matchId: number, rows: ReportRows | null, failed: Record<string, unknown> | null) {
  if (rows === null) {
    await check(supabase.from("fed_match_reports").upsert(failed!, { onConflict: "match_id" }), "fed_match_reports");
    for (const t of CHILD_TABLES) await check(supabase.from(t).delete().eq("match_id", matchId), `${t} delete`);
    return;
  }

  // Provisional: failed (y con un aviso que obliga a reprocesarla) hasta que las hijas estén escritas
  const provisional: ActaIssue = { level: "error", code: RETRY_CODES.incompleteSave, message: "Guardado a medias: se reprocesará." };
  await check(
    supabase.from("fed_match_reports").upsert({ ...rows.report, status: "failed", issues: [provisional] }, { onConflict: "match_id" }),
    "fed_match_reports"
  );
  for (const t of CHILD_TABLES) await check(supabase.from(t).delete().eq("match_id", matchId), `${t} delete`);

  const insert = async (table: string, list: Record<string, unknown>[]) => {
    if (list.length > 0) await check(supabase.from(table).insert(list), `${table} insert`);
  };
  await insert("fed_report_sets", rows.sets);
  await insert("fed_report_timeouts", rows.timeouts);
  await insert("fed_report_substitutions", rows.substitutions);
  await insert("fed_report_players", rows.players);
  await insert("fed_report_staff", rows.staff);
  await insert("fed_report_referees", rows.referees);
  await insert("fed_report_sanctions", rows.sanctions);

  await check(
    supabase.from("fed_match_reports").update({ status: rows.report.status, issues: rows.report.issues }).eq("match_id", matchId),
    "fed_match_reports status"
  );
}
