/**
 * Normaliza nombres de equipos para comparar entre Excel (clasificación) y matches.opponent.
 *
 *  - Lowercase
 *  - Strip acentos (NFD + descarta diacríticos)
 *  - Elimina prefijos comunes (c.v., c.d., club, cv, cd) y sufijos ("- masculino" etc.)
 *  - Colapsa espacios y signos no alfanuméricos a espacio simple
 */
const PREFIX_PATTERNS: RegExp[] = [
  /^c\.\s*v\.\s*/,
  /^c\.\s*d\.\s*/,
  /^club\s+voleibol\s+/,
  /^club\s+deportivo\s+/,
  /^club\s+/,
  /^cv\s+/,
  /^cd\s+/,
  /^a\.?d\.?\s+/,
  /^u\.?d\.?\s+/,
];

const SUFFIX_NOISE_PATTERNS: RegExp[] = [
  /\s*-\s*(masculino|femenino|male|female|m|f)\s*$/,
  /\s*\(.*?\)\s*$/,
];

export function normalizeTeamName(raw: string | null | undefined): string {
  if (!raw) return "";

  let s = String(raw).trim().toLowerCase();

  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  for (const pat of SUFFIX_NOISE_PATTERNS) s = s.replace(pat, "");
  for (const pat of PREFIX_PATTERNS) {
    const before = s;
    s = s.replace(pat, "");
    if (s !== before) break; // un solo prefijo
  }

  s = s.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

  return s;
}

/** Distancia Levenshtein iterativa (DP por filas). O(m·n). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[b.length];
}

/** Sugiere el candidato más próximo bajo umbral. Devuelve null si nada cumple. */
export function suggestClosest(
  needle: string,
  candidates: string[],
  maxDistance = 3
): { match: string; distance: number } | null {
  if (!needle || candidates.length === 0) return null;
  let best: { match: string; distance: number } | null = null;
  for (const c of candidates) {
    const d = levenshtein(needle, c);
    if (d <= maxDistance && (!best || d < best.distance)) {
      best = { match: c, distance: d };
    }
  }
  return best;
}
