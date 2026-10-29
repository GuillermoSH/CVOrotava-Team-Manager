import { supabaseAdmin } from "@/lib/supabase/admin";
import { fetchAll } from "@/lib/supabase/fetchAll";
import { buildMatchReport, type MatchReport, type ReportRowsInput } from "./report";

// Solo en servidor: las tablas del acta están cerradas a los clientes.

type Row = Record<string, unknown>;

const CHUNK = 100;
const CHILD_TABLES = ["fed_report_sets", "fed_report_timeouts", "fed_report_substitutions", "fed_report_players", "fed_report_staff", "fed_report_referees", "fed_report_sanctions"] as const;

async function rowsFor(table: string, ids: number[]): Promise<Row[]> {
  const out: Row[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    out.push(...(await fetchAll<Row>((a, b) => supabaseAdmin.from(table).select("*").in("match_id", chunk).range(a, b))));
  }
  return out;
}

const group = (rows: Row[]): Map<number, Row[]> => {
  const out = new Map<number, Row[]>();
  for (const r of rows) {
    const id = Number(r.match_id);
    out.set(id, [...(out.get(id) ?? []), r]);
  }
  return out;
};

/** Las actas de varios partidos a la vez; los que no tienen acta leída (o fallida) no salen en el mapa. */
export async function getMatchReports(matchIds: number[]): Promise<Map<number, MatchReport>> {
  const ids = [...new Set(matchIds)];
  const out = new Map<number, MatchReport>();
  if (ids.length === 0) return out;

  const reports = (await rowsFor("fed_match_reports", ids)).filter((r) => r.status === "ok" || r.status === "review");
  if (reports.length === 0) return out;
  const readable = reports.map((r) => Number(r.match_id));
  const [sets, timeouts, substitutions, players, staff, referees, sanctions] = (await Promise.all(CHILD_TABLES.map((t) => rowsFor(t, readable)))).map(group);

  for (const report of reports) {
    const id = Number(report.match_id);
    const input: ReportRowsInput = {
      report,
      sets: sets.get(id) ?? [],
      timeouts: timeouts.get(id) ?? [],
      substitutions: substitutions.get(id) ?? [],
      players: players.get(id) ?? [],
      staff: staff.get(id) ?? [],
      referees: referees.get(id) ?? [],
      sanctions: sanctions.get(id) ?? [],
    };
    const built = buildMatchReport(input);
    if (built) out.set(id, built);
  }
  return out;
}

/** Lee el acta de un partido; null si no hay o no se pudo leer (las fallidas no traen datos). */
export async function getMatchReport(matchId: number): Promise<MatchReport | null> {
  return (await getMatchReports([matchId])).get(matchId) ?? null;
}
