import { levenshtein, normalizeTeamName } from "@/lib/standings/normalize";

/**
 * Emparejamiento puro entre partidos de la federación (vistos desde nuestro
 * equipo) y filas de `matches`. Sin IO, para testearlo.
 */

export type FedOurMatch = {
  fedId: number;
  date: string; // YYYY-MM-DD
  opponent: string;
  /** Otros nombres del mismo club en otras temporadas (por ID de club de la federación). */
  opponentAliases?: string[];
};

export type OurMatchCandidate = {
  id: string;
  date: string;
  opponent: string;
  fed_match_id: number | null;
};

export type LinkPlan = {
  /** fedId → id de `matches` */
  links: Map<number, string>;
  /** fedIds sin pareja → crear */
  creates: number[];
};

/** Margen de fechas: partidos movidos un día o mal apuntados. */
export const MAX_DATE_DIFF_DAYS = 2;
const MAX_NAME_DISTANCE = 4;
/** Palabras que comparten muchos equipos y no identifican a ninguno. */
const GENERIC_TOKENS = new Set([
  "canarias", "voley", "volley", "voleibol", "volleyball", "club", "gran", "tenerife",
  "lanzarote", "fuerteventura", "palma", "palmas", "puerto", "santa", "cruz", "playa",
  "laguna", "sur", "norte",
]);

function dayDiff(a: string, b: string): number {
  return Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000;
}

/** 0 = mismo nombre; null = no parecen el mismo rival. */
export function opponentDistance(a: string, b: string): number | null {
  const na = normalizeTeamName(a);
  const nb = normalizeTeamName(b);
  if (!na || !nb) return null;
  if (na === nb) return 0;
  // Patrocinios añadidos/quitados: "gupane" vs "gupane guia", "dos 19 arinaga" vs "dos19 arinaga"
  const ca = na.replace(/\s/g, "");
  const cb = nb.replace(/\s/g, "");
  if (ca === cb || ca.includes(cb) || cb.includes(ca)) return 1;
  const distinctive = (s: string) =>
    s.split(" ").filter((t) => t.length > 3 && !GENERIC_TOKENS.has(t));
  const ta = new Set(distinctive(na));
  if (distinctive(nb).some((t) => ta.has(t))) return 2;
  const d = levenshtein(ca, cb);
  return d <= MAX_NAME_DISTANCE ? d : null;
}

/** Mejor parecido entre cualquiera de los nombres federados del rival y el nombre que tenemos. */
export function bestOpponentDistance(fedNames: string[], ourName: string): number | null {
  let best: number | null = null;
  for (const n of fedNames) {
    const d = opponentDistance(n, ourName);
    if (d !== null && (best === null || d < best)) best = d;
  }
  return best;
}

export function planMatchLinks(fed: FedOurMatch[], ours: OurMatchCandidate[]): LinkPlan {
  const links = new Map<number, string>();
  const takenOurs = new Set<string>();

  // 1. Enlaces ya existentes
  const fedIds = new Set(fed.map((f) => f.fedId));
  for (const o of ours) {
    if (o.fed_match_id !== null && fedIds.has(o.fed_match_id)) {
      links.set(o.fed_match_id, o.id);
      takenOurs.add(o.id);
    }
  }

  // 2. Candidatos por cercanía de fecha + parecido de rival (mejor primero)
  const pairs: { fedId: number; ourId: string; score: number }[] = [];
  for (const f of fed) {
    if (links.has(f.fedId)) continue;
    for (const o of ours) {
      if (takenOurs.has(o.id) || o.fed_match_id !== null) continue;
      const dd = dayDiff(f.date, o.date);
      if (dd > MAX_DATE_DIFF_DAYS) continue;
      const nd = bestOpponentDistance([f.opponent, ...(f.opponentAliases ?? [])], o.opponent);
      if (nd === null) continue;
      pairs.push({ fedId: f.fedId, ourId: o.id, score: dd * 10 + nd });
    }
  }
  pairs.sort((a, b) => a.score - b.score);
  for (const p of pairs) {
    if (links.has(p.fedId) || takenOurs.has(p.ourId)) continue;
    links.set(p.fedId, p.ourId);
    takenOurs.add(p.ourId);
  }

  return { links, creates: fed.filter((f) => !links.has(f.fedId)).map((f) => f.fedId) };
}

const KEEP_UPPER = /^(c\.?v\.?|c\.?d\.?|cdv|ud|sd|cb|hge|p-h|[ivx]+|\d+)$/i;
const KEEP_LOWER = new Set(["de", "del", "la", "las", "los", "el", "y"]);

/** "CV OROTAVA-PUERTO DE LA CRUZ" → "CV Orotava-Puerto de la Cruz" (solo filas nuevas). */
export function prettyTeamName(raw: string): string {
  const words = raw.trim().replace(/\s+/g, " ").split(" ");
  return words
    .map((w, i) => {
      if (KEEP_UPPER.test(w)) return w.toUpperCase();
      const lower = w.toLocaleLowerCase("es");
      // "CV Los Geranios": tras las siglas iniciales empieza el nombre
      const startsName = words.slice(0, i).every((p) => KEEP_UPPER.test(p));
      if (!startsName && KEEP_LOWER.has(lower)) return lower;
      return lower.replace(/(^|[-'(])(\p{L})/gu, (_, sep: string, c: string) => sep + c.toLocaleUpperCase("es"));
    })
    .join(" ");
}
