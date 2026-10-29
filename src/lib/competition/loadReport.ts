import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildMatchReport, type MatchReport } from "./report";

// Solo en servidor: las tablas del acta están cerradas a los clientes.

/** Lee el acta de un partido; null si no hay o no se pudo leer (las fallidas no traen datos). */
export async function getMatchReport(matchId: number): Promise<MatchReport | null> {
  const { data: report, error } = await supabaseAdmin.from("fed_match_reports").select("*").eq("match_id", matchId).maybeSingle();
  if (error) throw new Error(`fed_match_reports: ${error.message}`);
  if (!report || report.status === "failed") return null;

  const read = async (table: string): Promise<Record<string, unknown>[]> => {
    const { data, error: e } = await supabaseAdmin.from(table).select("*").eq("match_id", matchId);
    if (e) throw new Error(`${table}: ${e.message}`);
    return (data ?? []) as Record<string, unknown>[];
  };
  const [sets, timeouts, substitutions, players, staff, referees, sanctions] = await Promise.all([
    read("fed_report_sets"),
    read("fed_report_timeouts"),
    read("fed_report_substitutions"),
    read("fed_report_players"),
    read("fed_report_staff"),
    read("fed_report_referees"),
    read("fed_report_sanctions"),
  ]);
  return buildMatchReport({ report, sets, timeouts, substitutions, players, staff, referees, sanctions });
}
