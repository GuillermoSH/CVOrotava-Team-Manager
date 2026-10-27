/** Dominio donde la federación (Leverade / Clupik) publica las actas. */
const REPORT_HOST = /(^|\.)clupik\.com$/i;

/** Solo seguimos enlaces https de acta que sean del dominio de la federación. */
export function isTrustedReportUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && REPORT_HOST.test(url.hostname);
  } catch {
    return false;
  }
}
