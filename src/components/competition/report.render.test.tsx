import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { buildMatchReport, type ReportRowsInput } from "@/lib/competition/report";
import MatchReportPanel from "./MatchReportPanel";

/** Filas tal como las devuelve la base de datos (`time` con segundos, sin orden garantizado). */
const rows = (status: "ok" | "review" | "failed" = "ok"): ReportRowsInput => ({
  report: {
    match_id: 1,
    status,
    issues: status === "review" ? [{ level: "warning", code: "roster-empty", message: "Equipo B: el acta no trae la plantilla." }] : [],
    start_time: "17:00:00",
    end_time: "19:05:00",
    duration_min: 125,
    venue: "Pab. Mpal.",
    city: "Las Palmas",
    comments: "Retraso por la limpieza de la pista.",
    home_timeouts: 2,
    away_timeouts: 1,
    home_subs: 3,
    away_subs: 0,
  },
  sets: [
    { set_number: 2, start_time: "17:30:00", end_time: "17:58:00", duration_min: 28, home_points: 20, away_points: 25, home_timeouts: 0, away_timeouts: 1, home_subs: 0, away_subs: 0, home_lineup: [], away_lineup: [], home_serves_first: null, away_serves_first: null },
    { set_number: 1, start_time: "17:00:00", end_time: "17:28:00", duration_min: 28, home_points: 25, away_points: 22, home_timeouts: 2, away_timeouts: 0, home_subs: 3, away_subs: 0, home_lineup: [7, 2, 24, 95, 99, 4], away_lineup: [1, 0, 3, 4, 5, 6], home_serves_first: true, away_serves_first: false },
  ],
  timeouts: [
    { match_id: 1, set_number: 1, side: "home", seq: 2, own_points: 18, opp_points: 20 },
    { match_id: 1, set_number: 1, side: "home", seq: 1, own_points: 10, opp_points: 12 },
  ],
  substitutions: [{ match_id: 1, set_number: 1, side: "home", seq: 1, position: 4, player_in: 9, in_own: 13, in_opp: 12, back_own: 19, back_opp: 20 }],
  players: [
    { match_id: 1, side: "home", shirt_number: 9, name: "PEREZ ANA", is_libero: false },
    { match_id: 1, side: "home", shirt_number: 1, name: "STANEK MIKOLAJ", is_libero: true },
  ],
  staff: [{ match_id: 1, side: "home", seq: 1, role: "E", name: "LUCIA MOISES" }],
  referees: [{ match_id: 1, seq: 1, role: "1º", name: "SUAREZ OSCAR" }],
  sanctions: [{ match_id: 1, seq: 1, kind: "W", offender: "E", side: "away", set_number: 5, own_points: 9, opp_points: 9 }],
});

describe("buildMatchReport", () => {
  it("una acta fallida no se enseña", () => {
    expect(buildMatchReport(rows("failed"))).toBeNull();
  });

  it("ordena sets y eventos, recorta las horas y reparte por local y visitante", () => {
    const r = buildMatchReport(rows())!;
    expect(r.sets.map((s) => s.number)).toEqual([1, 2]);
    expect(r.start).toBe("17:00");
    expect(r.sets[0].start).toBe("17:00");
    expect(r.sets[0].home.timeouts).toEqual([
      { own: 10, opp: 12 },
      { own: 18, opp: 20 },
    ]);
    expect(r.sets[0].home.substitutions).toEqual([{ position: 4, playerIn: 9, scoreIn: { own: 13, opp: 12 }, scoreBack: { own: 19, opp: 20 } }]);
    expect(r.sets[0].away.timeouts).toEqual([]);
    expect(r.players.home.map((p) => p.number)).toEqual([1, 9]);
    expect(r.players.away).toEqual([]);
    expect(r.sanctions[0]).toEqual({ kind: "W", offender: "E", side: "away", set: 5, score: { own: 9, opp: 9 } });
  });
});

describe("panel de datos del acta", () => {
  const render = (status: "ok" | "review") =>
    renderToStaticMarkup(<MatchReportPanel report={buildMatchReport(rows(status))!} home="CV San Roque" away="Dos 19 Arinaga" />).replace(/<!-- -->/g, "");

  it("enseña los datos del partido, los sets, las jugadas y las plantillas", () => {
    const out = render("ok");
    expect(out).toContain("17:00 – 19:05");
    expect(out).toContain("125 min");
    expect(out).toContain("Pab. Mpal., Las Palmas");
    expect(out).toContain("Retraso por la limpieza de la pista.");
    expect(out).toContain("25-22");
    expect(out).toContain("Tiempo muerto");
    expect(out).toContain("con 10-12");
    expect(out).toContain("entra el 9 (PEREZ ANA)");
    expect(out).toContain("el titular vuelve con 19-20");
    expect(out).toContain("STANEK MIKOLAJ");
    expect(out).toContain("Líbero");
    expect(out).toContain("SUAREZ OSCAR");
    expect(out).toContain("Amonestación");
    expect(out).toContain("en el set 5");
    expect(out).not.toContain("irregularidades");
  });

  it("una alineación sin escribir se dice, y un 0 se enseña como guion", () => {
    const out = render("ok");
    expect(out).toContain("El acta no trae la alineación inicial.");
    expect(out).toContain("–");
  });

  it("un acta sin sets lo dice y no enseña tablas vacías", () => {
    const r = buildMatchReport({ ...rows("review"), sets: [], timeouts: [], substitutions: [] })!;
    const out = renderToStaticMarkup(<MatchReportPanel report={r} home="A" away="B" />);
    expect(out).toContain("ningún set jugado");
    expect(out).not.toContain("Set a set");
  });

  it("un acta a revisar avisa con sus irregularidades", () => {
    const out = render("review");
    expect(out).toContain("irregularidades");
    expect(out).toContain("Equipo B: el acta no trae la plantilla.");
  });
});
