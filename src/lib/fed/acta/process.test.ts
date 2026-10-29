import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseActa } from "./parse";
import { processMatch, type PendingMatch, type ProcessDeps } from "./process";
import { RETRY_CODES, reportRows, saveReport } from "./store";
import { actaStatus, compareWithFed, validateActa } from "./validate";
import type { ActaData, ActaItem } from "./types";
import a145743000 from "./__fixtures__/145743000.json";
import a143401289 from "./__fixtures__/143401289.json";
import a143401292 from "./__fixtures__/143401292.json";

const items = (raw: unknown): ActaItem[] => (raw as [string, number, number][]).map(([s, x, y]) => ({ s, x, y }));
const deps = (raw: unknown): ProcessDeps => ({ download: async () => new Uint8Array(), readItems: async () => items(raw) });

const match145743000: PendingMatch = {
  id: 145743000,
  reportUrl: "https://competitionmanager.clupik.com/matches/145743000/pdf-url-redirect",
  homeName: "CV SAN ROQUE B",
  awayName: "DOS 19 ARINAGA",
  homeSets: 3,
  awaySets: 2,
  sets: [
    { home: 22, away: 25 },
    { home: 20, away: 25 },
    { home: 25, away: 22 },
    { home: 25, away: 22 },
    { home: 18, away: 16 },
  ],
};

describe("processMatch", () => {
  it("un acta que cuadra sale ok, con el local asignado por los puntos y todas las filas", async () => {
    const out = await processMatch(match145743000, deps(a145743000));
    expect(out.status).toBe("ok");
    expect(out.issues).toEqual([]);
    // El nombre «CV SAN ROQUE B» no es el del acta («CV SAN ROQUE»): decide la coincidencia de los puntos de cada set
    expect(out.rows?.report).toMatchObject({ status: "ok", home_side: "B", home_name: "CV SAN ROQUE", away_name: "DOS 19 ARINAGA" });
    expect(out.rows?.sets).toHaveLength(5);
    expect(out.rows?.sets[0]).toMatchObject({ set_number: 1, home_points: 22, away_points: 25, home_timeouts: 2, away_timeouts: 0, home_serves_first: true });
  });

  it("todo va por local y visitante, con el marcador visto desde cada equipo", async () => {
    const out = await processMatch(match145743000, deps(a145743000));
    const r = out.rows!;
    // El local (CV SAN ROQUE) pidió dos tiempos muertos en el set 1, en 21:23 y 21:24 de su propio marcador
    expect(r.timeouts.filter((t) => t.set_number === 1)).toEqual([
      { match_id: 145743000, set_number: 1, side: "home", seq: 1, own_points: 21, opp_points: 23 },
      { match_id: 145743000, set_number: 1, side: "home", seq: 2, own_points: 21, opp_points: 24 },
    ]);
    // Las dos sustituciones del visitante del set 1, con la vuelta del titular
    expect(r.substitutions.filter((s) => s.set_number === 1 && s.side === "away")).toEqual([
      { match_id: 145743000, set_number: 1, side: "away", seq: 1, position: 1, player_in: 13, in_own: 13, in_opp: 12, back_own: 19, back_opp: 20 },
      { match_id: 145743000, set_number: 1, side: "away", seq: 2, position: 4, player_in: 9, in_own: 13, in_opp: 12, back_own: 19, back_opp: 20 },
    ]);
    expect(r.players.filter((p) => p.side === "home")).toHaveLength(12);
    expect(r.players.filter((p) => p.side === "away")).toHaveLength(13);
    expect(r.players.find((p) => p.side === "home" && p.shirt_number === 1)).toMatchObject({ name: "STANEK MIKOLAJ", is_libero: true });
    expect(r.staff.find((s) => s.side === "away" && s.role === "E")).toMatchObject({ name: "LUCIA MOISES" });
    expect(r.referees).toEqual([{ match_id: 145743000, seq: 1, role: "1º", name: "SUAREZ OSCAR", license: "16229" }]);
    expect(r.sanctions).toEqual([{ match_id: 145743000, seq: 1, kind: "W", offender: "E", side: "away", set_number: 5, own_points: 9, opp_points: 9 }]);
  });

  it("un acta con irregularidades documentadas sale a revisar y se guarda igualmente", async () => {
    const out = await processMatch(
      { id: 143401289, reportUrl: "https://competitionmanager.clupik.com/x", homeName: "CD VOLEYPUERTO", awayName: "CV LA VICTORIA", homeSets: 1, awaySets: 3, sets: [{ home: 20, away: 25 }, { home: 15, away: 25 }, { home: 26, away: 24 }, { home: 21, away: 25 }] },
      deps(a143401289)
    );
    expect(out.status).toBe("review");
    expect(out.rows).not.toBeNull();
    expect(out.rows?.players).toEqual([]);
    // Alineación sin escribir: vacía, no inventada
    expect(out.rows?.sets[0].home_lineup).toEqual([]);
  });

  it("un acta que no es de este partido sale fallida y sin datos", async () => {
    const out = await processMatch({ ...match145743000, homeName: "OTRO", awayName: "EQUIPO", sets: [{ home: 25, away: 10 }, { home: 25, away: 10 }, { home: 25, away: 10 }], homeSets: 3, awaySets: 0 }, deps(a145743000));
    expect(out.status).toBe("failed");
    expect(out.rows).toBeNull();
    expect(out.failed).toMatchObject({ match_id: 145743000, status: "failed", home_side: null });
    expect(out.issues.map((i) => i.code)).toContain("fed-mismatch");
  });

  it("un PDF que no se descarga se reintenta en la siguiente pasada", async () => {
    const out = await processMatch(match145743000, {
      download: async () => {
        throw new Error("La federación responde 503.");
      },
      readItems: async () => [],
    });
    expect(out.status).toBe("retry");
    expect(out.issues[0]).toMatchObject({ code: RETRY_CODES.download, message: "La federación responde 503." });
  });

  it("un PDF que no es un acta sale fallido, no a reintentar", async () => {
    const out = await processMatch(match145743000, { download: async () => new Uint8Array(), readItems: async () => [{ s: "Otra cosa", x: 1, y: 1 }] });
    expect(out.status).toBe("failed");
    expect(out.rows).toBeNull();
  });
});

// ─── Guardado ──────────────────────────────────────────────────

type Call = { table: string; op: string; payload?: unknown; filter?: unknown };

/** Cliente de Supabase de pega: anota cada operación y falla en la que se le diga. */
function fakeSupabase(failOn?: { table: string; op: string }) {
  const calls: Call[] = [];
  const result = (table: string, op: string) => ({ error: failOn && failOn.table === table && failOn.op === op ? { message: "boom" } : null });
  const client = {
    from: (table: string) => ({
      upsert: (payload: unknown) => {
        calls.push({ table, op: "upsert", payload });
        return Promise.resolve(result(table, "upsert"));
      },
      insert: (payload: unknown) => {
        calls.push({ table, op: "insert", payload });
        return Promise.resolve(result(table, "insert"));
      },
      delete: () => ({
        eq: (_c: string, v: unknown) => {
          calls.push({ table, op: "delete", filter: v });
          return Promise.resolve(result(table, "delete"));
        },
      }),
      update: (payload: unknown) => ({
        eq: (_c: string, v: unknown) => {
          calls.push({ table, op: "update", payload, filter: v });
          return Promise.resolve(result(table, "update"));
        },
      }),
    }),
  };
  return { client: client as unknown as SupabaseClient, calls };
}

function okRows() {
  const parsed = parseActa(items(a143401292));
  const data = parsed.data as ActaData;
  const issues = [...parsed.issues, ...validateActa(data)];
  const cmp = compareWithFed(data, {
    homeName: "CDV SAN ROQUE",
    awayName: "CV SUAC CANARIAS",
    homeSets: 1,
    awaySets: 3,
    sets: [{ home: 20, away: 25 }, { home: 25, away: 20 }, { home: 14, away: 25 }, { home: 20, away: 25 }],
  });
  expect(cmp.issues).toEqual([]);
  return reportRows(143401292, data, cmp.homeSide!, actaStatus(issues), issues);
}

describe("saveReport", () => {
  it("escribe primero la fila del partido como provisional, reemplaza las hijas y solo al final la da por buena", async () => {
    const { client, calls } = fakeSupabase();
    const rows = okRows();
    await saveReport(client, 143401292, rows, null);

    expect(calls[0]).toMatchObject({ table: "fed_match_reports", op: "upsert" });
    expect((calls[0].payload as { status: string; issues: { code: string }[] }).status).toBe("failed");
    expect((calls[0].payload as { issues: { code: string }[] }).issues[0].code).toBe(RETRY_CODES.incompleteSave);

    const deleted = calls.filter((c) => c.op === "delete").map((c) => c.table);
    expect(deleted).toEqual([
      "fed_report_sets",
      "fed_report_timeouts",
      "fed_report_substitutions",
      "fed_report_players",
      "fed_report_staff",
      "fed_report_referees",
      "fed_report_sanctions",
    ]);
    expect(calls.filter((c) => c.op === "insert").map((c) => c.table)).toEqual([
      "fed_report_sets",
      "fed_report_timeouts",
      "fed_report_substitutions",
      "fed_report_players",
      "fed_report_staff",
      "fed_report_referees",
      "fed_report_sanctions",
    ]);
    // Lo último que se escribe es el estado definitivo
    expect(calls.at(-1)).toMatchObject({ table: "fed_match_reports", op: "update", filter: 143401292, payload: { status: rows.report.status } });
  });

  it("si falla una tabla hija, lanza y el estado definitivo nunca llega a escribirse", async () => {
    const { client, calls } = fakeSupabase({ table: "fed_report_players", op: "insert" });
    await expect(saveReport(client, 143401292, okRows(), null)).rejects.toThrow("fed_report_players insert: boom");
    expect(calls.some((c) => c.op === "update")).toBe(false);
  });

  it("un acta fallida guarda solo su fila con los avisos y limpia lo que hubiera de antes", async () => {
    const { client, calls } = fakeSupabase();
    const failed = { match_id: 7, status: "failed", issues: [{ level: "error", code: "x", message: "m" }], home_side: null };
    await saveReport(client, 7, null, failed);
    expect(calls[0]).toMatchObject({ table: "fed_match_reports", op: "upsert", payload: failed });
    expect(calls.filter((c) => c.op === "delete")).toHaveLength(7);
    expect(calls.some((c) => c.op === "insert")).toBe(false);
  });
});

// ─── Selección de pendientes y pasada completa ─────────────────

import { createQueryChain } from "@/test/security/queryChain";
import { loadPending, processPendingReports } from "./process";
import { ACTA_PARSER_VERSION } from "./types";

function dbWith(tables: Record<string, unknown[]>) {
  const client = {
    from: (t: string) => createQueryChain({ data: tables[t] ?? [], error: null }),
  };
  return client as unknown as SupabaseClient;
}

const baseTables = () => ({
  fed_tournaments: [
    { id: 1, season: "2024-25" },
    { id: 2, season: "2025-26" },
  ],
  fed_matches: [
    { id: 10, tournament_id: 1, home_team_id: 1, away_team_id: 2, home_sets: 3, away_sets: 0, report_url: "u10", local_date: "2025-03-01" },
    { id: 20, tournament_id: 2, home_team_id: 3, away_team_id: 4, home_sets: 3, away_sets: 0, report_url: "u20", local_date: "2025-10-01" },
    { id: 21, tournament_id: 2, home_team_id: 3, away_team_id: 4, home_sets: 3, away_sets: 1, report_url: "u21", local_date: "2025-10-08" },
    { id: 22, tournament_id: 2, home_team_id: 3, away_team_id: 4, home_sets: 3, away_sets: 2, report_url: "u22", local_date: "2025-10-15" },
    { id: 23, tournament_id: 2, home_team_id: 3, away_team_id: 4, home_sets: 0, away_sets: 3, report_url: "u23", local_date: "2025-10-22" },
  ],
  fed_match_reports: [
    // ya leído con la versión actual: no se repite
    { match_id: 20, parser_version: ACTA_PARSER_VERSION, status: "ok", issues: [] },
    // leído con una versión antigua: se repite
    { match_id: 21, parser_version: ACTA_PARSER_VERSION - 1, status: "ok", issues: [] },
    // fallo de descarga: se reintenta
    { match_id: 22, parser_version: ACTA_PARSER_VERSION, status: "failed", issues: [{ level: "error", code: RETRY_CODES.download, message: "" }] },
    // fallido de verdad (no coincide con el partido): no se reintenta cada semana
    { match_id: 23, parser_version: ACTA_PARSER_VERSION, status: "failed", issues: [{ level: "error", code: "fed-mismatch", message: "" }] },
  ],
  fed_teams: [
    { id: 3, name: "LOCAL" },
    { id: 4, name: "VISITANTE" },
  ],
  fed_match_sets: [
    { match_id: 21, set_number: 2, home_points: 25, away_points: 20 },
    { match_id: 21, set_number: 1, home_points: 25, away_points: 10 },
  ],
});

describe("loadPending", () => {
  it("elige lo que falta, está a medias o es de una versión antigua, y ni lo ya leído ni lo anterior a las actas", async () => {
    const pending = await loadPending(dbWith(baseTables()));
    expect(pending.map((m) => m.id).sort()).toEqual([21, 22]);
  });

  it("con force vuelve a todo lo de las temporadas con acta", async () => {
    const pending = await loadPending(dbWith(baseTables()), { force: true });
    expect(pending.map((m) => m.id).sort()).toEqual([20, 21, 22, 23]);
  });

  it("trae los nombres de los equipos y los sets en orden", async () => {
    const [m] = (await loadPending(dbWith(baseTables()))).filter((x) => x.id === 21);
    expect(m).toMatchObject({ homeName: "LOCAL", awayName: "VISITANTE", homeSets: 3, awaySets: 1 });
    expect(m.sets).toEqual([{ home: 25, away: 10 }, { home: 25, away: 20 }]);
  });

  it("respeta el límite, con los más recientes primero", async () => {
    const pending = await loadPending(dbWith(baseTables()), { limit: 1 });
    expect(pending.map((m) => m.id)).toEqual([22]);
  });

  it("sin torneos de esas temporadas no hay nada que hacer", async () => {
    expect(await loadPending(dbWith(baseTables()), { seasons: ["2030-31"] })).toEqual([]);
  });
});

describe("processPendingReports", () => {
  it("resume la pasada, sin escribir en un ensayo", async () => {
    const tables = baseTables();
    const summary = await processPendingReports({
      supabase: dbWith(tables),
      dryRun: true,
      deps: {
        download: async () => {
          throw new Error("sin red");
        },
        readItems: async () => [],
      },
    });
    expect(summary).toEqual({ processed: 2, ok: 0, review: 0, failed: 0, retry: 2, remaining: 0 });
  });

  it("deja pendiente lo que no cabe en el tiempo disponible", async () => {
    const summary = await processPendingReports({
      supabase: dbWith(baseTables()),
      dryRun: true,
      budgetMs: -1,
      deps: { download: async () => new Uint8Array(), readItems: async () => [] },
    });
    expect(summary.processed).toBe(0);
    expect(summary.remaining).toBe(2);
  });
});
