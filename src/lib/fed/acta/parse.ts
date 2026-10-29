import {
  ACTA_PARSER_VERSION,
  type ActaData,
  type ActaIssue,
  type ActaItem,
  type ActaParseResult,
  type ActaPlayer,
  type ActaReferee,
  type ActaSanction,
  type ActaScore,
  type ActaSet,
  type ActaSetSide,
  type ActaStaff,
  type ActaSubstitution,
  type ActaTimeout,
  type Side,
} from "./types";

/**
 * Extractor puro del acta: recibe los textos del PDF con su posición y devuelve los datos.
 *
 * El acta sale de una plantilla fija (misma hoja, mismas columnas en todas), así que se lee por
 * posición: cada set es un panel cuyo origen es su «Inicio:», y las columnas del campo (I a VI) y
 * las filas (alineación, sustituciones, tiempos muertos) están a distancias fijas de ese origen.
 * Nada se da por bueno sin comprobarlo: lo que no cuadra sale en `issues` y la validación
 * posterior lo contrasta con los puntos de cada set que ya tenemos de la federación.
 */

// ─── Utilidades ────────────────────────────────────────────────

const within = (v: number, lo: number, hi: number) => v >= lo && v <= hi;
const isInt = (s: string) => /^\d+$/.test(s.trim());
const clean = (s: string) => s.replace(/\s+/g, " ").trim();

function scoreOf(s: string): ActaScore | null {
  const m = /^(\d+):(\d+)$/.exec(s.trim());
  return m ? { own: Number(m[1]), opp: Number(m[2]) } : null;
}

function timeOf(s: string): string | null {
  const m = /(\d{1,2}):(\d{2})/.exec(s);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : null;
}

const minutesOf = (s: string): number | null => {
  const m = /^(\d+)'$/.exec(s.trim());
  return m ? Number(m[1]) : null;
};

/** dd/mm/yyyy → yyyy-mm-dd */
function dateOf(s: string): string | null {
  const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(s);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/** Nombre normalizado para comparar equipos: sin tildes, sin signos y en minúsculas. */
export function normalizeTeam(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Texto de varios fragmentos en el orden en que se leen (arriba abajo, izquierda a derecha). */
function joinReading(items: ActaItem[]): string {
  return clean([...items].sort((a, b) => Math.round(a.y / 3) - Math.round(b.y / 3) || a.x - b.x).map((i) => i.s).join(" "));
}

/**
 * Reparte fragmentos de texto (nombres que se parten en varias líneas) entre los anclajes más
 * cercanos por altura: el dorsal queda centrado entre las líneas de su nombre.
 */
function attachByNearestY<T extends { y: number }>(anchors: T[], fragments: ActaItem[], maxGap = 12): Map<T, ActaItem[]> {
  const out = new Map<T, ActaItem[]>(anchors.map((a) => [a, []]));
  for (const f of fragments) {
    let best: T | null = null;
    let bestGap = Infinity;
    for (const a of anchors) {
      const gap = Math.abs(a.y - f.y);
      if (gap < bestGap) {
        best = a;
        bestGap = gap;
      }
    }
    if (best && bestGap <= maxGap) out.get(best)!.push(f);
  }
  return out;
}

// ─── Plantilla ─────────────────────────────────────────────────

/** Columnas del campo (posiciones I a VI) respecto al «Inicio:» de su panel: la del equipo de la izquierda y la de la derecha. */
const ROT_LEFT = [-108, -90, -70, -53, -34, -16];
const ROT_RIGHT = [39, 58, 75, 93, 112, 132];
const ROT_TOL = 9;

const colOf = (x: number, x0: number, offsets: number[]): number => {
  let best = -1;
  let bestGap = Infinity;
  offsets.forEach((off, i) => {
    const gap = Math.abs(x - (x0 + off));
    if (gap < bestGap) {
      best = i;
      bestGap = gap;
    }
  });
  return bestGap <= ROT_TOL ? best : -1;
};

type Panel = {
  set: number;
  x0: number;
  y0: number;
  start: string | null;
  end: string | null;
  /**
   * Quién hay en la rejilla de la izquierda y quién en la de la derecha. Las letras A y B que
   * rotulan cada rejilla cambian de un set a otro, así que el equipo se identifica por su nombre.
   */
  left: { name: string; startsServing: boolean | null };
  right: { name: string; startsServing: boolean | null };
};

// ─── Cabecera ──────────────────────────────────────────────────

function parseHeader(items: ActaItem[]) {
  const top = items.filter((i) => i.y < 45);
  const rowA = top.filter((i) => within(i.y, 18, 28));
  const rowB = top.filter((i) => within(i.y, 29, 40));

  const competition = clean(rowA.find((i) => i.x < 60)?.s ?? "") || null;
  const group = clean(rowB.find((i) => i.x < 60)?.s ?? "") || null;

  const jornada = rowA.find((i) => i.s.trim() === "Jornada:");
  const dateItem = rowA.find((i) => dateOf(i.s) !== null);
  const round = jornada
    ? clean(
        rowA
          .filter((i) => i.x > jornada.x + 5 && (!dateItem || i.x < dateItem.x - 5))
          .sort((a, b) => a.x - b.x)
          .map((i) => i.s)
          .join(" ")
      ) || null
    : null;

  const pabellon = rowA.find((i) => i.s.trim() === "Pabellón:");
  const venue = pabellon ? clean(rowA.filter((i) => i.x > pabellon.x + 5).sort((a, b) => a.x - b.x).map((i) => i.s).join(" ")) || null : null;
  const ciudad = rowB.find((i) => i.s.trim() === "Ciudad:");
  const city = ciudad ? clean(rowB.filter((i) => i.x > ciudad.x + 5).sort((a, b) => a.x - b.x).map((i) => i.s).join(" ")) || null : null;

  const timeItem = rowB.find((i) => /^\d{1,2}:\d{2}$/.test(i.s.trim()) && i.x > 300);

  return {
    competition,
    group,
    round,
    date: dateItem ? dateOf(dateItem.s) : null,
    time: timeItem ? timeOf(timeItem.s) : null,
    venue,
    city,
  };
}

// ─── Paneles de set ────────────────────────────────────────────

function findPanels(items: ActaItem[], issues: ActaIssue[]): Panel[] {
  const inicios = items.filter((i) => i.s.startsWith("Inicio:")).sort((a, b) => a.y - b.y || a.x - b.x);
  if (inicios.length === 0) return [];

  // Filas de paneles: se separan por saltos grandes de altura
  const rows: number[] = [];
  for (const i of inicios) if (!rows.some((r) => Math.abs(r - i.y) < 40)) rows.push(i.y);
  rows.sort((a, b) => a - b);

  const panels: Panel[] = [];
  for (const ini of inicios) {
    const row = rows.findIndex((r) => Math.abs(r - ini.y) < 40);
    const col = ini.x < 400 ? 0 : 1;
    const set = row * 2 + col + 1;
    const { x: x0, y: y0 } = ini;
    const sameRow = (i: ActaItem) => Math.abs(i.y - y0) <= 4;

    const letter = (xLo: number, xHi: number): ActaItem | undefined =>
      items.find((i) => sameRow(i) && /^[AB]$/.test(i.s.trim()) && within(i.x, x0 + xLo, x0 + xHi));
    const leftLetter = letter(-118, -106);
    const rightLetter = letter(28, 42);
    const nameAfter = (l: ActaItem | undefined, xHi: number): string =>
      l ? clean(items.filter((i) => sameRow(i) && i.x > l.x + 1 && i.x < x0 + xHi && !/^(R|S)$/.test(i.s.trim()) && !i.s.startsWith("Inicio") && !i.s.trim().startsWith("Fin")).sort((a, b) => a.x - b.x).map((i) => i.s).join(" ")) : "";
    const flag = (xLo: number, xHi: number): boolean | null => {
      const f = items.find((i) => sameRow(i) && /^[RS]$/.test(i.s.trim()) && within(i.x, x0 + xLo, x0 + xHi));
      return f ? f.s.trim() === "S" : null;
    };
    const fin = items.find((i) => sameRow(i) && i.s.trim().startsWith("Fin:") && within(i.x, x0 + 140, x0 + 165));

    if (!leftLetter || !rightLetter) {
      issues.push({ level: "error", code: "panel-teams", message: `Set ${set}: no se leen los equipos del panel.` });
      continue;
    }
    panels.push({
      set,
      x0,
      y0,
      start: timeOf(ini.s),
      end: fin ? timeOf(fin.s) : null,
      left: { name: nameAfter(leftLetter, -30), startsServing: flag(20, 31) },
      right: { name: nameAfter(rightLetter, 120), startsServing: flag(165, 180) },
    });
  }
  return panels.sort((a, b) => a.set - b.set);
}

function parsePanelSide(items: ActaItem[], panel: Panel, which: "left" | "right", side: Side, issues: ActaIssue[]): ActaSetSide {
  const { x0, y0 } = panel;
  const team = { side, startsServing: panel[which].startsServing };
  const offsets = which === "left" ? ROT_LEFT : ROT_RIGHT;
  const empty: ActaSetSide = { lineup: [], substitutions: [], timeouts: [], startsServing: team.startsServing };

  const inCols = (i: ActaItem) => within(i.x, x0 + offsets[0] - ROT_TOL, x0 + offsets[5] + ROT_TOL + 12) && colOf(i.x, x0, offsets) >= 0;
  const colItems = (yLo: number, yHi: number, pattern: (s: string) => boolean) =>
    items.filter((i) => within(i.y, yLo, yHi) && pattern(i.s) && inCols(i)).map((i) => ({ col: colOf(i.x, x0, offsets), s: i.s.trim() }));

  // La fila de la alineación está a la altura de la segunda fila de la rejilla de puntos («2 14 26 38»),
  // que está impresa siempre: sirve de regla para medir las filas de sustituciones aunque no haya
  // dorsales escritos. El rótulo de cada fila no está a la misma altura que sus datos.
  const yLine = items.find((i) => i.s.trim() === "14" && within(i.x, x0 + 3, x0 + 15) && within(i.y, y0 + 12, y0 + 40))?.y;
  if (yLine === undefined) {
    issues.push({ level: "error", code: "panel-rows", message: `Set ${panel.set}: no se encuentran las filas del panel.` });
    return empty;
  }

  // Alineación inicial: un dorsal por posición (si el acta no los trae, queda vacía)
  const lineup = Array<number>(6).fill(0);
  for (const c of colItems(yLine - 3, yLine + 3, isInt)) lineup[c.col] = Number(c.s);
  const found = lineup.filter((n) => n !== 0).length;
  if (found === 0) {
    issues.push({ level: "warning", code: "lineup-missing", message: `Set ${panel.set}, equipo ${team.side}: el acta no trae la alineación inicial.` });
    lineup.length = 0;
  } else if (found < 6) {
    issues.push({ level: "warning", code: "lineup-incomplete", message: `Set ${panel.set}, equipo ${team.side}: la alineación inicial no tiene los seis dorsales.` });
  }

  // Sustituciones: dorsal que entra, marcador de entrada y marcador de vuelta del titular
  const playersIn = colItems(yLine + 7, yLine + 17, isInt);
  const scoresIn = colItems(yLine + 19, yLine + 30, (s) => scoreOf(s) !== null);
  const scoresBack = colItems(yLine + 31, yLine + 42, (s) => scoreOf(s) !== null);
  const substitutions: ActaSubstitution[] = [];
  const entering = new Set([...scoresIn.map((c) => c.col), ...playersIn.map((c) => c.col)]);
  for (const col of [...entering].sort((x, y) => x - y)) {
    const player = playersIn.find((c) => c.col === col);
    const inn = scoresIn.find((c) => c.col === col);
    const back = scoresBack.find((c) => c.col === col);
    if (!inn) {
      issues.push({ level: "warning", code: "sub-score", message: `Set ${panel.set}, equipo ${team.side}: sustitución en la posición ${col + 1} sin marcador.` });
      continue;
    }
    substitutions.push({ position: col + 1, playerIn: player ? Number(player.s) : null, scoreIn: scoreOf(inn.s)!, scoreBack: back ? scoreOf(back.s) : null });
  }

  // Tiempos muertos: marcadores bajo la «T» de su rejilla
  const tx = which === "left" ? x0 + 11 : x0 + 157;
  const tLabel = items.find((i) => /^"?T"?$/.test(i.s.trim()) && within(i.x, tx - 8, tx + 8) && within(i.y, y0 + 65, y0 + 100));
  const timeouts: ActaTimeout[] = [];
  if (tLabel) {
    const found = items
      .filter((i) => scoreOf(i.s) !== null && within(i.x, tx - 8, tx + 8) && i.y > tLabel.y + 4 && i.y < tLabel.y + 40)
      .sort((a, b) => a.y - b.y);
    for (const f of found) timeouts.push({ score: scoreOf(f.s)! });
  }

  return { lineup, substitutions, timeouts, startsServing: team.startsServing };
}

// ─── Cuadro de resultado ───────────────────────────────────────

type SummaryRow = { timeouts: number; substitutions: number; won: number; points: number };

function parseSummary(items: ActaItem[], issues: ActaIssue[]) {
  const res = items.find((i) => i.s.trim() === "RESULTADO");
  if (!res) {
    issues.push({ level: "error", code: "no-summary", message: "No se encuentra el cuadro de resultado." });
    return null;
  }
  const ry = res.y;
  const nameRow = items.filter((i) => within(i.y, ry + 2, ry + 9));
  const leftName = clean(nameRow.filter((i) => within(i.x, 340, 431)).sort((a, b) => a.x - b.x).map((i) => i.s).join(" "));
  const rightName = clean(nameRow.filter((i) => within(i.x, 432, 580)).sort((a, b) => a.x - b.x).map((i) => i.s).join(" "));

  const pickCols = (row: ActaItem[], xs: number[]): (number | null)[] =>
    xs.map((x) => {
      const hit = row.filter((i) => isInt(i.s) && Math.abs(i.x - x) <= 8).sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0];
      return hit ? Number(hit.s) : null;
    });
  const LEFT = [370, 387, 403, 418];
  const RIGHT = [466, 484, 500, 516];

  const rowFor = (y: number) => items.filter((i) => Math.abs(i.y - y) <= 3);
  const setRows = items
    .filter((i) => /^[1-5]$/.test(i.s.trim()) && within(i.x, 436, 443) && i.y > ry + 12)
    .sort((a, b) => a.y - b.y);

  const sets: { number: number; left: SummaryRow; right: SummaryRow; durationMin: number | null }[] = [];
  for (const s of setRows) {
    const row = rowFor(s.y);
    const l = pickCols(row, LEFT);
    const r = pickCols(row, RIGHT);
    const dur = row.find((i) => within(i.x, 440, 455) && minutesOf(i.s) !== null);
    // El cuadro trae siempre cinco filas: las de sets que no se jugaron salen con el número y sin datos
    if ((l[3] ?? 0) === 0 && (r[0] ?? 0) === 0) continue;
    if ([...l, ...r].some((v) => v === null)) {
      issues.push({ level: "error", code: "summary-cell", message: `Set ${s.s}: faltan celdas en el cuadro de resultado.` });
    }
    sets.push({
      number: Number(s.s),
      left: { timeouts: l[0] ?? 0, substitutions: l[1] ?? 0, won: l[2] ?? 0, points: l[3] ?? 0 },
      right: { points: r[0] ?? 0, won: r[1] ?? 0, substitutions: r[2] ?? 0, timeouts: r[3] ?? 0 },
      durationMin: dur ? minutesOf(dur.s) : null,
    });
  }

  // Fila de totales: la siguiente tras el último set, con la duración total
  const lastY = setRows.length ? setRows[setRows.length - 1].y : ry + 12;
  const totalsDur = items.find((i) => within(i.x, 436, 446) && minutesOf(i.s) !== null && i.y > lastY + 3 && i.y < lastY + 30);
  let totals: { left: SummaryRow; right: SummaryRow; durationMin: number | null } | null = null;
  if (totalsDur) {
    const row = rowFor(totalsDur.y);
    const l = pickCols(row, LEFT);
    const r = pickCols(row, RIGHT);
    totals = {
      left: { timeouts: l[0] ?? 0, substitutions: l[1] ?? 0, won: l[2] ?? 0, points: l[3] ?? 0 },
      right: { points: r[0] ?? 0, won: r[1] ?? 0, substitutions: r[2] ?? 0, timeouts: r[3] ?? 0 },
      durationMin: minutesOf(totalsDur.s),
    };
  }

  // Hora de inicio y de fin del partido
  const lblY = items.find((i) => i.s.trim() === "Inicio" && within(i.x, 380, 400) && i.y > ry)?.y;
  const times = lblY !== undefined ? items.filter((i) => within(i.y, lblY + 1, lblY + 16) && within(i.x, 380, 500)) : [];
  const start = times.find((i) => within(i.x, 380, 420) && timeOf(i.s))?.s;
  const end = times.find((i) => within(i.x, 425, 470) && timeOf(i.s))?.s;

  // Ganador
  const g = items.find((i) => i.s.trim() === "GANADOR:");
  let winner: { team: string; setsWinner: number; setsLoser: number } | null = null;
  if (g) {
    const row = items.filter((i) => Math.abs(i.y - g.y) <= 3 && i.x > g.x + 5 && i.x < 466 + 30 && i.s.trim() !== "FIRMAS");
    const sc = row.find((i) => /^\d+\s*:\s*\d+$/.test(i.s.trim()));
    const m = sc ? /(\d+)\s*:\s*(\d+)/.exec(sc.s) : null;
    const nm = clean(row.filter((i) => i !== sc).sort((a, b) => a.x - b.x).map((i) => i.s).join(" "));
    if (m && nm) winner = { team: nm, setsWinner: Number(m[1]), setsLoser: Number(m[2]) };
  }

  return { leftName, rightName, sets, totals, start: start ? timeOf(start) : null, end: end ? timeOf(end) : null, winner };
}

// ─── Plantillas, cuerpo técnico, árbitros, sanciones, comentarios ──

/** Rótulos de sección que caen sobre las columnas de nombres y no son parte de ninguno. */
const SECTION_LABEL = /^(LÍBERO|LIBERO|FIRMAS|MIEMBROS DEL CUERPO TECNICO ADMITIDOS EN BANQUILLO)$/;

type Roster = { players: ActaPlayer[]; staff: ActaStaff[]; name: string; side: Side | null };

function parseRosters(items: ActaItem[], issues: ActaIssue[]): { left: Roster; right: Roster } | null {
  const hdr = items.find((i) => i.s.trim() === "Nº" && within(i.x, 570, 590) && i.y > 280);
  if (!hdr) {
    issues.push({ level: "error", code: "no-roster", message: "No se encuentra la plantilla de los equipos." });
    return null;
  }
  const letterRow = items.filter((i) => within(i.y, hdr.y - 12, hdr.y - 3));
  const lLetter = letterRow.find((i) => /^[AB]$/.test(i.s.trim()) && within(i.x, 572, 586));
  const rLetter = letterRow.find((i) => /^[AB]$/.test(i.s.trim()) && within(i.x, 652, 666));
  const nameOf = (l: ActaItem | undefined, xHi: number) =>
    l ? clean(letterRow.filter((i) => i.x > l.x + 1 && i.x < xHi && i !== l).sort((a, b) => a.x - b.x).map((i) => i.s).join(" ")) : "";

  const yLibero = items.find((i) => i.s.trim() === "LÍBERO" && i.y > hdr.y)?.y ?? Infinity;
  const yStaff = items.find((i) => i.s.startsWith("MIEMBROS DEL CUERPO TECNICO"))?.y ?? Infinity;
  const yFirmas = items.find((i) => i.s.trim() === "FIRMAS")?.y ?? Infinity;

  const cols = {
    left: { num: [570, 586], name: [586, 652] },
    right: { num: [652, 666], name: [666, 790] },
  } as const;

  const read = (which: "left" | "right", yLo: number, yHi: number, numberPattern: (s: string) => boolean) => {
    const c = cols[which];
    const anchors = items
      .filter((i) => within(i.y, yLo, yHi - 0.01) && within(i.x, c.num[0], c.num[1]) && numberPattern(i.s))
      .sort((a, b) => a.y - b.y);
    const frags = items.filter(
      (i) => within(i.y, yLo - 3, yHi + 3) && within(i.x, c.name[0], c.name[1]) && !SECTION_LABEL.test(i.s.trim())
    );
    const owned = attachByNearestY(anchors, frags);
    return anchors.map((a) => ({ label: a.s.trim(), name: joinReading(owned.get(a) ?? []) }));
  };

  const build = (which: "left" | "right", letter: ActaItem | undefined, xHi: number): Roster => {
    const players: ActaPlayer[] = [
      ...read(which, hdr.y + 4, yLibero, isInt)
        .filter((p) => p.name)
        .map((p) => ({ number: Number(p.label), name: p.name, libero: false })),
      ...read(which, yLibero + 3, yStaff, isInt)
        .filter((p) => p.name)
        .map((p) => ({ number: Number(p.label), name: p.name, libero: true })),
    ];
    const staff: ActaStaff[] = read(which, yStaff + 4, yFirmas, (s) => /^[A-Z]\d?$/.test(s.trim()))
      .filter((p) => p.name)
      .map((p) => ({ role: p.label, name: p.name }));
    return { players, staff, name: nameOf(letter, xHi), side: letter ? (letter.s.trim() as Side) : null };
  };

  return { left: build("left", lLetter, 652), right: build("right", rLetter, 800) };
}

function parseReferees(items: ActaItem[]): ActaReferee[] {
  const hdr = items.find((i) => i.s.trim() === "Árbitros");
  if (!hdr) return [];
  const roles = items
    .filter((i) => /^\dº$/.test(i.s.trim()) && within(i.x, 200, 216) && i.y > hdr.y + 4 && i.y < hdr.y + 60)
    .sort((a, b) => a.y - b.y);
  const names = attachByNearestY(roles, items.filter((i) => within(i.x, 218, 270) && i.y > hdr.y + 4 && i.y < hdr.y + 60), 7);
  return roles
    .map((r) => {
      const lic = items.find((i) => within(i.x, 272, 322) && Math.abs(i.y - r.y) <= 4 && /^\w+$/.test(i.s.trim()));
      return { role: r.s.trim(), name: joinReading(names.get(r) ?? []), license: lic ? lic.s.trim() : null };
    })
    .filter((r) => r.name);
}

function parseSanctions(items: ActaItem[]): ActaSanction[] {
  const hdr = items.find((i) => i.s.trim() === "W" && i.x < 45 && i.y > 420);
  if (!hdr) return [];
  const body = items.filter((i) => within(i.x, 30, 200) && i.y > hdr.y + 3 && i.y < hdr.y + 60 && i.s.trim() !== ":");
  const ys: number[] = [];
  for (const i of body.sort((a, b) => a.y - b.y)) if (!ys.some((y) => Math.abs(y - i.y) <= 3)) ys.push(i.y);

  const KINDS: { kind: ActaSanction["kind"]; x: number }[] = [
    { kind: "W", x: 37 },
    { kind: "P", x: 58 },
    { kind: "E", x: 78 },
    { kind: "D", x: 98 },
  ];
  const out: ActaSanction[] = [];
  for (const y of ys) {
    const row = body.filter((i) => Math.abs(i.y - y) <= 3);
    const team = row.find((i) => /^[AB]$/.test(i.s.trim()) && within(i.x, 110, 126));
    const set = row.find((i) => isInt(i.s) && within(i.x, 132, 150));
    const score = row.find((i) => scoreOf(i.s) !== null && within(i.x, 155, 195));
    for (const k of KINDS) {
      const hit = row.find((i) => Math.abs(i.x - k.x) <= 8 && i !== team && i !== set && i !== score);
      if (hit) {
        out.push({
          kind: k.kind,
          offender: hit.s.trim(),
          team: team ? (team.s.trim() as Side) : null,
          set: set ? Number(set.s) : null,
          score: score ? scoreOf(score.s) : null,
        });
      }
    }
  }
  return out;
}

function parseComments(items: ActaItem[]): string | null {
  const c = items.find((i) => i.s.trim() === "Comentarios");
  if (!c) return null;
  const ap = items.find((i) => i.s.trim() === "APROBADO" && within(i.x, 255, 285) && i.y > c.y);
  const yMax = ap ? ap.y - 0.5 : c.y + 20;
  const text = joinReading(items.filter((i) => within(i.x, 190, 330) && i.y > c.y + 3 && i.y < yMax));
  return text || null;
}

// ─── Punto de entrada ──────────────────────────────────────────

export function parseActa(items: ActaItem[]): ActaParseResult {
  const issues: ActaIssue[] = [];
  const header = parseHeader(items);
  const panels = findPanels(items, issues);
  const summary = parseSummary(items, issues);
  const rosters = parseRosters(items, issues);

  if (!summary || !rosters) return { data: null, issues };
  if (panels.length === 0) {
    // Un partido sin sets jugados (incomparecencia) no tiene paneles; con sets en el resultado, algo falla
    issues.push(
      summary.sets.length === 0
        ? { level: "warning", code: "no-sets", message: "El acta no tiene ningún set jugado (¿incomparecencia?)." }
        : { level: "warning", code: "no-panels", message: "Hay sets en el resultado pero el acta no trae ningún panel de set." }
    );
  }

  // Los equipos y su letra salen de las plantillas, que son del partido entero. Dentro de los sets
  // las letras de cada rejilla cambian, así que allí se reconoce a cada equipo por su nombre.
  const rosterOf: Partial<Record<Side, Roster>> = {};
  for (const r of [rosters.left, rosters.right]) if (r.side) rosterOf[r.side] ??= r;
  if (!rosterOf.A || !rosterOf.B) {
    issues.push({ level: "error", code: "roster-sides", message: "Las plantillas no llevan las letras A y B." });
    return { data: null, issues };
  }
  const teams = { A: rosterOf.A.name, B: rosterOf.B.name };
  const other = (s: Side): Side => (s === "A" ? "B" : "A");

  /** Equipo al que corresponde un nombre; si solo se reconoce el contrario, este es el otro. */
  const resolve = (name: string, counterpart: string): Side | null => {
    const sideOf = (n: string): Side | null => {
      const k = normalizeTeam(n);
      if (k === normalizeTeam(teams.A)) return "A";
      if (k === normalizeTeam(teams.B)) return "B";
      return null;
    };
    return sideOf(name) ?? (sideOf(counterpart) ? other(sideOf(counterpart)!) : null);
  };

  const leftSummarySide = resolve(summary.leftName, summary.rightName);
  if (!leftSummarySide) {
    issues.push({ level: "error", code: "summary-teams", message: `El cuadro de resultado no coincide con los equipos (${summary.leftName} / ${summary.rightName}).` });
    return { data: null, issues };
  }
  const rowOf = (sum: { left: SummaryRow; right: SummaryRow }, side: Side) => (side === leftSummarySide ? sum.left : sum.right);

  const sets: ActaSet[] = [];
  for (const sum of summary.sets) {
    const panel = panels.find((p) => p.set === sum.number);
    if (!panel) {
      // Un set que solo está en el resultado (el acta no trae su panel): se guarda con sus puntos y nada más
      issues.push({ level: "warning", code: "set-panel", message: `Set ${sum.number}: aparece en el resultado pero el acta no trae su panel.` });
      const none = (): ActaSetSide => ({ lineup: [], substitutions: [], timeouts: [], startsServing: null });
      const pa = rowOf(sum, "A");
      const pb = rowOf(sum, "B");
      sets.push({
        number: sum.number,
        start: null,
        end: null,
        durationMin: sum.durationMin,
        A: none(),
        B: none(),
        summary: {
          A: { timeouts: pa.timeouts, substitutions: pa.substitutions, points: pa.points },
          B: { timeouts: pb.timeouts, substitutions: pb.substitutions, points: pb.points },
        },
      });
      continue;
    }
    const leftSide = resolve(panel.left.name, panel.right.name);
    if (!leftSide) {
      issues.push({ level: "error", code: "panel-teams", message: `Set ${sum.number}: los equipos del panel (${panel.left.name} / ${panel.right.name}) no son los del partido.` });
      continue;
    }
    const sides = { left: leftSide, right: other(leftSide) };
    const bySide = {} as Record<Side, ActaSetSide>;
    bySide[sides.left] = parsePanelSide(items, panel, "left", sides.left, issues);
    bySide[sides.right] = parsePanelSide(items, panel, "right", sides.right, issues);
    const a = rowOf(sum, "A");
    const b = rowOf(sum, "B");
    sets.push({
      number: sum.number,
      start: panel.start,
      end: panel.end,
      durationMin: sum.durationMin,
      A: bySide.A,
      B: bySide.B,
      summary: {
        A: { timeouts: a.timeouts, substitutions: a.substitutions, points: a.points },
        B: { timeouts: b.timeouts, substitutions: b.substitutions, points: b.points },
      },
    });
  }

  const tot = summary.totals;
  const totA = tot ? rowOf(tot, "A") : null;
  const totB = tot ? rowOf(tot, "B") : null;
  // La columna «V» del acta no es fiable (sale a cero en actas rellenadas a posteriori): los sets
  // ganados se cuentan de los puntos de cada set.
  const setsWon: Record<Side, number> = { A: 0, B: 0 };
  for (const set of sets) {
    if (set.summary.A.points > set.summary.B.points) setsWon.A++;
    else if (set.summary.B.points > set.summary.A.points) setsWon.B++;
  }

  const data: ActaData = {
    parserVersion: ACTA_PARSER_VERSION,
    ...header,
    teams,
    sets,
    totals: {
      A: { timeouts: totA?.timeouts ?? 0, substitutions: totA?.substitutions ?? 0, setsWon: setsWon.A, points: totA?.points ?? 0 },
      B: { timeouts: totB?.timeouts ?? 0, substitutions: totB?.substitutions ?? 0, setsWon: setsWon.B, points: totB?.points ?? 0 },
      start: summary.start,
      end: summary.end,
      durationMin: tot?.durationMin ?? null,
    },
    winner: summary.winner,
    roster: { A: rosterOf.A.players, B: rosterOf.B.players },
    staff: { A: rosterOf.A.staff, B: rosterOf.B.staff },
    referees: parseReferees(items),
    sanctions: parseSanctions(items),
    comments: parseComments(items),
  };
  return { data, issues };
}
