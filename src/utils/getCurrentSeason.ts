/** Temporada deportiva: arranca en septiembre. Ej: 2025/26 */
export function getCurrentSeason(date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 = enero, 8 = septiembre
  const startYear = month >= 8 ? year : year - 1;
  const endYear = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}/${endYear}`;
}

/** Temporada siguiente a una etiqueta `YYYY/YY`. */
export function getNextSeason(season: string): string {
  const start = Number.parseInt(season.slice(0, 4), 10);
  if (!Number.isFinite(start)) return getCurrentSeason();
  const endYear = String((start + 2) % 100).padStart(2, "0");
  return `${start + 1}/${endYear}`;
}

/**
 * Opciones para selects de temporada.
 * Incluye la actual, la siguiente (anticipar 26/27) y unas cuantas anteriores.
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
    seasons.push(`${y}/${end}`);
  }

  return seasons.map((s) => ({ value: s, label: s }));
}
