/** «2026-27» → «2025-26». Devuelve null si no es una temporada válida. */
export function previousSeasonId(season: string): string | null {
  const m = /^(\d{4})-(\d{2})$/.exec(season);
  if (!m) return null;
  const start = Number(m[1]) - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/** Fecha de hoy (YYYY-MM-DD) en hora de Canarias. */
export function todayInCanarias(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Atlantic/Canary",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
