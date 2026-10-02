/**
 * Canonical season label shared with Portal: `YYYY-YY` (e.g. `2026-27`).
 * Accepts legacy Team Manager `YYYY/YY` and normalizes to hyphen.
 */

const SEASON_RE = /^(\d{4})[/-](\d{2})$/;

/** Normalize any known season label to Portal/TM canonical `YYYY-YY`. */
export function normalizeSeasonId(season: string): string {
  const trimmed = season.trim();
  const match = trimmed.match(SEASON_RE);
  if (!match) return trimmed;
  return `${match[1]}-${match[2]}`;
}

/** Temporada deportiva: arranca en septiembre. Ej: 2026-27 */
export function getCurrentSeason(date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 = enero, 8 = septiembre
  const startYear = month >= 8 ? year : year - 1;
  const endYear = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${endYear}`;
}

/** Temporada siguiente a una etiqueta `YYYY-YY` (también acepta legacy `/`). */
export function getNextSeason(season: string): string {
  const normalized = normalizeSeasonId(season);
  const start = Number.parseInt(normalized.slice(0, 4), 10);
  if (!Number.isFinite(start)) return getCurrentSeason();
  const endYear = String((start + 2) % 100).padStart(2, "0");
  return `${start + 1}-${endYear}`;
}

/**
 * Opciones para selects de temporada.
 * Incluye la actual, la siguiente y unas cuantas anteriores (formato `YYYY-YY`).
 */
export function getSeasonSelectOptions(opts?: {
  past?: number;
  includeNext?: boolean;
  asOf?: Date;
}): { value: string; label: string }[] {
  const past = opts?.past ?? 3;
  const includeNext = opts?.includeNext ?? true;
  const current = getCurrentSeason(opts?.asOf);

  const start = Number.parseInt(current.slice(0, 4), 10);
  const seasons: string[] = [];

  if (includeNext) seasons.push(getNextSeason(current));

  for (let i = 0; i <= past; i++) {
    const y = start - i;
    const end = String((y + 1) % 100).padStart(2, "0");
    seasons.push(`${y}-${end}`);
  }

  return seasons.map((s) => ({ value: s, label: s }));
}
