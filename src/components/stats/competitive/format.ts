const NBSP = " ";

export const ordinal = (n: number) => `${n}.º`;

export const percent = (p: number) => `${Math.round(p * 100)}${NBSP}%`;

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", ...opts });
const LONG = fmt({ weekday: "long", day: "numeric", month: "long" });
const SHORT = fmt({ day: "numeric", month: "short" });
const FULL = fmt({ day: "numeric", month: "short", year: "numeric" });

const at = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** «sábado, 24 de octubre» → «Sábado 24 de octubre». */
export function longDate(iso: string): string {
  const s = LONG.format(at(iso)).replace(",", "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export const shortDate = (iso: string) => SHORT.format(at(iso)).replace(".", "");
export const fullDate = (iso: string) => FULL.format(at(iso)).replace(".", "");

export function daysUntil(iso: string, today: string): number {
  return Math.round((at(iso).getTime() - at(today).getTime()) / 86_400_000);
}

export function whenLabel(iso: string, today: string): string {
  const d = daysUntil(iso, today);
  if (d === 0) return "Hoy";
  if (d === 1) return "Mañana";
  if (d > 1 && d < 7) return `En ${d} días`;
  return longDate(iso);
}
