import * as XLSX from "xlsx";
import { normalizeTeamName } from "./normalize";

export type StandingRow = {
  position: number;
  team_name: string;
  normalized_name: string;
  played: number;
  won: number;
  lost: number;
  sets_for: number;
  sets_against: number;
  points_for: number | null;
  points_against: number | null;
  league_points: number;
};

export type ParseResult = {
  rows: StandingRow[];
  warnings: string[];
  headers: string[];
};

const HEADER_MAP: Record<keyof StandingRow | "team_raw", string[]> = {
  position: ["pos", "posicion", "posición", "puesto", "#"],
  team_name: ["equipo", "club", "team", "nombre"],
  team_raw: [],
  normalized_name: [],
  played: ["pj", "jugados", "partidos jugados", "j"],
  won: ["pg", "ganados", "partidos ganados", "victorias"],
  lost: ["pp", "perdidos", "partidos perdidos", "derrotas"],
  sets_for: ["sf", "sg", "sets a favor", "sets favor", "a favor"],
  sets_against: [
    "sc",
    "sp",
    "sets en contra",
    "sets contra",
    "en contra",
  ],
  points_for: [
    "pf",
    "puntos a favor",
    "puntos favor",
    "parciales a favor",
    "tantos a favor",
  ],
  points_against: [
    "pc",
    "puntos en contra",
    "puntos contra",
    "parciales en contra",
    "parciales contra",
    "tantos contra",
  ],
  league_points: ["pts", "puntos", "ptos", "points"],
};

function normHeader(h: unknown): string {
  return String(h ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function tokenize(h: string): string[] {
  return h
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Matching de columnas en dos fases, sin `startsWith` permisivo:
 *   1. Igualdad exacta (normalizada).
 *   2. Tokens del alias completamente contenidos en los tokens del header.
 *      Ej: alias `"partidos ganados"` matchea `"Partidos ganados"` y
 *      `"Partidos ganados con 3 puntos"`. Alias `"a favor"` no matchea
 *      `"Puntos a favor"` por separado porque ese matchea antes el alias
 *      `"puntos a favor"` (más específico y se evalúa en `points_for`).
 *      `"a favor"` queda reservado a la columna corta `"A favor"`.
 */
function findColumn(headers: string[], aliases: string[]): number {
  const normHeaders = headers.map(normHeader);
  for (const a of aliases) {
    const idx = normHeaders.indexOf(a.toLowerCase());
    if (idx >= 0) return idx;
  }
  for (const a of aliases) {
    const aTokens = tokenize(a.toLowerCase());
    if (aTokens.length === 0) continue;
    const idx = normHeaders.findIndex((h) => {
      if (!h) return false;
      const hTokens = tokenize(h);
      if (hTokens.length === 0) return false;
      return aTokens.every((t) => hTokens.includes(t));
    });
    if (idx >= 0) return idx;
  }
  return -1;
}

/**
 * Parseo numérico locale-aware (es-ES con miles `.` y decimal `,`).
 *
 * Casos cubiertos:
 *   "1.813,5"     → 1813.5  (miles `.` + decimal `,`)
 *   "1.813"       → 1813    (miles `.`)
 *   "7,11"        → 7.11    (decimal `,`)
 *   "1.5"         → 1.5     (decimal `.`)
 *   1813 (number) → 1813
 *   1.813 (float) → 1813    (Excel guarda erróneamente miles como float)
 *
 * Heurística defensiva: para `number` con 3 decimales exactos y |v| < 10,
 * asumimos formato europeo mal interpretado y multiplicamos por 1000.
 * Sin esto Postgres rechaza por `invalid input syntax for type integer`.
 */
function toNumber(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;

  if (typeof v === "number") {
    if (!Number.isInteger(v) && Math.abs(v) < 10) {
      const s = String(v);
      if (/^-?\d+\.\d{3}$/.test(s)) {
        return Math.round(v * 1000);
      }
    }
    return v;
  }

  let s = String(v).trim().replace(/\s/g, "");
  if (!s) return 0;
  const neg = s.startsWith("-");
  if (neg) s = s.slice(1);

  if (/^\d{1,3}(\.\d{3})+,\d+$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, "");
  } else if (/^\d+,\d+$/.test(s)) {
    s = s.replace(",", ".");
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return neg ? -n : n;
}

function findHeaderRow(grid: unknown[][]): number {
  const teamAliases = HEADER_MAP.team_name.map((s) => s.toLowerCase());
  for (let i = 0; i < Math.min(grid.length, 15); i++) {
    const row = grid[i] ?? [];
    const found = row.some((cell) => {
      const n = normHeader(cell);
      return teamAliases.some((a) => n === a);
    });
    if (found) return i;
  }
  return 0;
}

export function parseStandings(buffer: ArrayBuffer | Buffer): ParseResult {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const warnings: string[] = [];
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    return { rows: [], warnings: ["El archivo no contiene hojas."], headers: [] };
  }

  const sheet = wb.Sheets[sheetName];
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
  });

  if (!grid.length) {
    return { rows: [], warnings: ["La hoja está vacía."], headers: [] };
  }

  const headerRowIdx = findHeaderRow(grid);
  const headers = (grid[headerRowIdx] ?? []).map((h) => String(h ?? "").trim());

  const colIdx = {
    position: findColumn(headers, HEADER_MAP.position),
    team: findColumn(headers, HEADER_MAP.team_name),
    played: findColumn(headers, HEADER_MAP.played),
    won: findColumn(headers, HEADER_MAP.won),
    lost: findColumn(headers, HEADER_MAP.lost),
    sets_for: findColumn(headers, HEADER_MAP.sets_for),
    sets_against: findColumn(headers, HEADER_MAP.sets_against),
    points_for: findColumn(headers, HEADER_MAP.points_for),
    points_against: findColumn(headers, HEADER_MAP.points_against),
    league_points: findColumn(headers, HEADER_MAP.league_points),
  };

  if (colIdx.team < 0) {
    return {
      rows: [],
      warnings: [
        `No se encontró la columna de equipo. Cabeceras detectadas: ${headers.join(", ")}`,
      ],
      headers,
    };
  }
  if (colIdx.league_points < 0) warnings.push("No se encontró columna de puntos (Pts).");
  if (colIdx.played < 0) warnings.push("No se encontró columna de partidos jugados (PJ).");
  if (colIdx.sets_for < 0 || colIdx.sets_against < 0) {
    warnings.push("No se encontró columna de sets favor/contra.");
  }

  const rows: StandingRow[] = [];
  let fallbackPos = 1;

  for (let i = headerRowIdx + 1; i < grid.length; i++) {
    const r = grid[i];
    if (!r || r.length === 0) continue;
    const teamRaw = String(r[colIdx.team] ?? "").trim();
    if (!teamRaw) continue;
    if (/^total/i.test(teamRaw)) continue;

    const positionRaw = colIdx.position >= 0 ? toNumber(r[colIdx.position]) : 0;
    const position = positionRaw > 0 ? positionRaw : fallbackPos;
    fallbackPos = position + 1;

    rows.push({
      position,
      team_name: teamRaw,
      normalized_name: normalizeTeamName(teamRaw),
      played: colIdx.played >= 0 ? toNumber(r[colIdx.played]) : 0,
      won: colIdx.won >= 0 ? toNumber(r[colIdx.won]) : 0,
      lost: colIdx.lost >= 0 ? toNumber(r[colIdx.lost]) : 0,
      sets_for: colIdx.sets_for >= 0 ? toNumber(r[colIdx.sets_for]) : 0,
      sets_against: colIdx.sets_against >= 0 ? toNumber(r[colIdx.sets_against]) : 0,
      points_for:
        colIdx.points_for >= 0 ? toNumber(r[colIdx.points_for]) : null,
      points_against:
        colIdx.points_against >= 0 ? toNumber(r[colIdx.points_against]) : null,
      league_points:
        colIdx.league_points >= 0 ? toNumber(r[colIdx.league_points]) : 0,
    });
  }

  rows.sort((a, b) => a.position - b.position);

  if (!rows.length) warnings.push("No se encontraron filas con datos.");

  return { rows, warnings, headers };
}
