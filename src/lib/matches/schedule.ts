/** Un partido se da por terminado dos horas después del saque (como en el calendario). */
export const MATCH_DURATION_MS = 2 * 60 * 60 * 1000;

/** `date` (YYYY-MM-DD) + `time` (HH:MM[:SS]) en hora local; sin hora, a las 00:00. */
export function matchStart(date: string, time?: string | null): Date {
  const t = time && /^\d{2}:\d{2}/.test(time) ? time.slice(0, 5) : "00:00";
  return new Date(`${date.slice(0, 10)}T${t}`);
}

export function isMatchPast(date: string, time: string | null | undefined, now: Date): boolean {
  return now.getTime() > matchStart(date, time).getTime() + MATCH_DURATION_MS;
}

/** Días naturales (por calendario local) desde `now` hasta el día del partido. */
export function daysUntil(date: string, now: Date): number {
  const start = matchStart(date);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((start.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

export function countdownLabel(days: number): string {
  if (days <= 0) return "Hoy";
  if (days === 1) return "Mañana";
  return `En ${days} días`;
}

/** Enlace para añadir el partido a Google Calendar. */
export function googleCalendarLink(opts: {
  opponent: string;
  date: string;
  time?: string | null;
  venue?: string | null;
}): string {
  const start = matchStart(opts.date, opts.time);
  const fmt = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, "");
  const end = new Date(start.getTime() + MATCH_DURATION_MS);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    "Partido vs " + opts.opponent
  )}&dates=${fmt(start)}/${fmt(end)}&location=${encodeURIComponent(opts.venue ?? "")}`;
}
