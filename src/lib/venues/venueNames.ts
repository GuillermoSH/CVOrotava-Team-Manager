/**
 * ¿Dos nombres de pabellón son el mismo sitio?
 * "Pabellón Quiquirá La Orotava" ≈ "Pabellón Quiquirá"
 * "Pab. Miguel A. Díaz Molina 2" ≈ "Pab. Miguel Ángel Díaz Molina"
 * "IES San Matías" ≠ "CEIP San Matías" (el tipo de centro sí distingue)
 */

/** Palabras que no identifican el sitio (tipo de instalación, artículos). */
const GENERIC = new Set([
  "pab", "pabellon", "pabellones", "polid", "polideportivo", "pol", "mpal",
  "municipal", "deportivo", "deportes", "cubierto", "insular", "p", "m", "pm",
  "de", "del", "la", "las", "los", "el", "y",
]);

const fold = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Marcadores de la federación que no son un pabellón ("POR DETERMINAR"...). */
export function isPlaceholderVenueName(name: string): boolean {
  const n = fold(name).replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
  return /^(por|a) (determinar|confirmar|asignar)$|^sin (asignar|pabellon)$|^pendiente( de asignar)?$/.test(n);
}

/**
 * ¿Puede un pabellón federado heredar el venue que ya tenía nuestro partido?
 * Solo si los nombres son compatibles; si no, el alias se creaba a ciegas y
 * arrastraba errores nuestros (Quiquirá→Díaz Molina, Galeón→Tijoco...).
 * Lo dudoso queda como venue pendiente de revisar.
 */
export function canLearnVenueAlias(facilityName: string, venueName: string): boolean {
  return !isPlaceholderVenueName(facilityName) && sameVenueName(facilityName, venueName);
}

/** Palabras distintivas; quita genéricas y números de pista ("... 1", "... 2"). */
export function venueTokens(name: string): string[] {
  return fold(name)
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter((t) => t && !GENERIC.has(t) && !/^\d+$/.test(t));
}

const tokenMatches = (a: string, b: string) =>
  a === b || (a.length === 1 && b.startsWith(a)) || (b.length === 1 && a.startsWith(b));

/**
 * Mismo sitio si todas las palabras del nombre más corto aparecen en el largo
 * (las iniciales cuentan: "A." = "Ángel"). Exige al menos una palabra
 * distintiva de 4+ letras para no emparejar por casualidad.
 */
export function sameVenueName(a: string, b: string): boolean {
  const ta = venueTokens(a);
  const tb = venueTokens(b);
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  if (!short.some((t) => t.length >= 4)) return false;
  return short.every((t) => long.some((u) => tokenMatches(t, u)));
}

/**
 * Venue al que corresponde `name` entre `candidates`, solo si no hay duda:
 * todas las coincidencias deben tener el mismo nombre (puede haber varias filas
 * del mismo pabellón para distintos equipos; `preferTeam` desempata).
 */
export function findVenueByName<T extends { id: string; venue_name: string; team_name?: string | null }>(
  name: string,
  candidates: T[],
  preferTeam?: (teamName: string) => boolean
): T | null {
  const hits = candidates.filter((c) => sameVenueName(c.venue_name, name));
  if (hits.length === 0) return null;
  const distinctNames = new Set(hits.map((h) => venueTokens(h.venue_name).join(" ")));
  if (distinctNames.size > 1) return null;
  return (preferTeam && hits.find((h) => h.team_name && preferTeam(h.team_name))) || hits[0];
}
