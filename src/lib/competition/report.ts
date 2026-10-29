/**
 * Datos del acta de un partido de la federación (tablas `fed_match_reports` y `fed_report_*`), ya
 * ordenados para pintarlos (la lectura de la base de datos está en loadReport.ts). Todo va por local y visitante.
 */

export type ReportSide = "home" | "away";
export type ReportStatus = "ok" | "review";

export type ReportIssue = { level: "error" | "warning"; code: string; message: string };

export type ReportPlayer = { number: number; name: string; libero: boolean };
export type ReportScore = { own: number; opp: number };

export type ReportSubstitution = { position: number; playerIn: number | null; scoreIn: ReportScore; scoreBack: ReportScore | null };

export type ReportSetSide = {
  /** Tiempos muertos y sustituciones según el cuadro de resultado del acta. */
  timeoutsCount: number;
  subsCount: number;
  /** Dorsales por posición (I a VI); 0 = sin escribir; vacío = el acta no trae alineación. */
  lineup: number[];
  startsServing: boolean | null;
  timeouts: ReportScore[];
  substitutions: ReportSubstitution[];
};

export type ReportSet = {
  number: number;
  start: string | null;
  end: string | null;
  durationMin: number | null;
  home: ReportSetSide & { points: number };
  away: ReportSetSide & { points: number };
};

export type MatchReport = {
  status: ReportStatus;
  issues: ReportIssue[];
  start: string | null;
  end: string | null;
  durationMin: number | null;
  venue: string | null;
  city: string | null;
  comments: string | null;
  totals: Record<ReportSide, { timeouts: number | null; subs: number | null }>;
  sets: ReportSet[];
  players: Record<ReportSide, ReportPlayer[]>;
  staff: Record<ReportSide, { role: string; name: string }[]>;
  referees: { role: string; name: string }[];
  sanctions: { kind: "W" | "P" | "E" | "D"; offender: string; side: ReportSide | null; set: number | null; score: ReportScore | null }[];
};

export type ReportRowsInput = {
  report: Record<string, unknown>;
  sets: Record<string, unknown>[];
  timeouts: Record<string, unknown>[];
  substitutions: Record<string, unknown>[];
  players: Record<string, unknown>[];
  staff: Record<string, unknown>[];
  referees: Record<string, unknown>[];
  sanctions: Record<string, unknown>[];
};

const num = (v: unknown): number => Number(v);
const numOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
const strOrNull = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);
/** `time` de Postgres llega como HH:MM:SS. */
const hhmm = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v.slice(0, 5) : null);
const bySeq = <T extends Record<string, unknown>>(a: T, b: T) => num(a.seq) - num(b.seq);

/** De las filas de las tablas al acta lista para pintar; null si el acta no se pudo leer. */
export function buildMatchReport(rows: ReportRowsInput): MatchReport | null {
  const r = rows.report;
  if (r.status !== "ok" && r.status !== "review") return null;
  const sides: ReportSide[] = ["home", "away"];

  const sets: ReportSet[] = [...rows.sets]
    .sort((a, b) => num(a.set_number) - num(b.set_number))
    .map((s) => {
      const n = num(s.set_number);
      const side = (w: ReportSide): ReportSetSide & { points: number } => ({
        points: num(s[`${w}_points`]),
        timeoutsCount: num(s[`${w}_timeouts`]),
        subsCount: num(s[`${w}_subs`]),
        lineup: ((s[`${w}_lineup`] as number[] | null) ?? []).map(Number),
        startsServing: (s[`${w}_serves_first`] as boolean | null) ?? null,
        timeouts: rows.timeouts
          .filter((t) => num(t.set_number) === n && t.side === w)
          .sort(bySeq)
          .map((t) => ({ own: num(t.own_points), opp: num(t.opp_points) })),
        substitutions: rows.substitutions
          .filter((x) => num(x.set_number) === n && x.side === w)
          .sort(bySeq)
          .map((x) => ({
            position: num(x.position),
            playerIn: numOrNull(x.player_in),
            scoreIn: { own: num(x.in_own), opp: num(x.in_opp) },
            scoreBack: x.back_own === null || x.back_own === undefined ? null : { own: num(x.back_own), opp: num(x.back_opp) },
          })),
      });
      return { number: n, start: hhmm(s.start_time), end: hhmm(s.end_time), durationMin: numOrNull(s.duration_min), home: side("home"), away: side("away") };
    });

  const list = <T,>(w: ReportSide, items: Record<string, unknown>[], f: (x: Record<string, unknown>) => T): T[] => items.filter((x) => x.side === w).map(f);

  return {
    status: r.status,
    issues: (r.issues as ReportIssue[] | null) ?? [],
    start: hhmm(r.start_time),
    end: hhmm(r.end_time),
    durationMin: numOrNull(r.duration_min),
    venue: strOrNull(r.venue),
    city: strOrNull(r.city),
    comments: strOrNull(r.comments),
    totals: {
      home: { timeouts: numOrNull(r.home_timeouts), subs: numOrNull(r.home_subs) },
      away: { timeouts: numOrNull(r.away_timeouts), subs: numOrNull(r.away_subs) },
    },
    sets,
    players: Object.fromEntries(
      sides.map((w) => [
        w,
        list(w, rows.players, (p) => ({ number: num(p.shirt_number), name: String(p.name), libero: Boolean(p.is_libero) })).sort((a, b) => a.number - b.number),
      ])
    ) as MatchReport["players"],
    staff: Object.fromEntries(
      sides.map((w) => [w, [...rows.staff].sort(bySeq).filter((x) => x.side === w).map((x) => ({ role: String(x.role), name: String(x.name) }))])
    ) as MatchReport["staff"],
    referees: [...rows.referees].sort(bySeq).map((x) => ({ role: String(x.role), name: String(x.name) })),
    sanctions: [...rows.sanctions].sort(bySeq).map((x) => ({
      kind: x.kind as "W" | "P" | "E" | "D",
      offender: String(x.offender),
      side: (x.side as ReportSide | null) ?? null,
      set: numOrNull(x.set_number),
      score: x.own_points === null || x.own_points === undefined ? null : { own: num(x.own_points), opp: num(x.opp_points) },
    })),
  };
}
