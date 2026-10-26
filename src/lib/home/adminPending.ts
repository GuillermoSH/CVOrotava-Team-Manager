import { isMatchPast } from "@/lib/matches/schedule";

export type PlayerDocsRow = {
  id: string;
  full_name: string;
  license_completed: boolean;
  registration_papers_received: boolean;
  photo_consent: boolean;
};

export type PendingDocs = { playerId: string; name: string; missing: string[] };

const DOC_LABELS: [keyof PlayerDocsRow, string][] = [
  ["license_completed", "Licencia"],
  ["registration_papers_received", "Hoja de inscripción"],
  ["photo_consent", "Consentimiento de fotos"],
];

/** Jugadores con algún documento sin entregar y qué les falta, por orden alfabético. */
export function pendingDocs(players: PlayerDocsRow[]): PendingDocs[] {
  return players
    .map((p) => ({
      playerId: p.id,
      name: p.full_name,
      missing: DOC_LABELS.filter(([key]) => !p[key]).map(([, label]) => label),
    }))
    .filter((p) => p.missing.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
}

export type BirthdayRow = { id: string; full_name: string; birth_date: string | null };
export type Birthday = { playerId: string; name: string; daysAway: number; turns: number; date: string };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Próximos cumpleaños (hoy incluido) en los siguientes `windowDays` días. `today` es YYYY-MM-DD. */
export function upcomingBirthdays(players: BirthdayRow[], today: string, windowDays = 14): Birthday[] {
  const [ty, tm, td] = today.split("-").map(Number);
  const todayUtc = Date.UTC(ty, tm - 1, td);
  const out: Birthday[] = [];

  for (const p of players) {
    if (!p.birth_date) continue;
    const [by, bm, bd] = p.birth_date.split("-").map(Number);
    if (!by || !bm || !bd) continue;
    // 29 de febrero: en años no bisiestos se celebra el 1 de marzo (Date.UTC lo normaliza).
    let year = ty;
    let next = Date.UTC(year, bm - 1, bd);
    if (next < todayUtc) {
      year += 1;
      next = Date.UTC(year, bm - 1, bd);
    }
    const daysAway = Math.round((next - todayUtc) / DAY_MS);
    if (daysAway > windowDays) continue;
    const d = new Date(next);
    out.push({
      playerId: p.id,
      name: p.full_name,
      daysAway,
      turns: year - by,
      date: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`,
    });
  }
  return out.sort((a, b) => a.daysAway - b.daysAway || a.name.localeCompare(b.name, "es"));
}

export type MatchVideoRow = {
  id: string;
  opponent: string;
  date: string;
  time?: string | null;
  /** Se mantiene al enlazar o quitar un vídeo del partido (syncVideoForMatch). */
  video_url?: string | null;
};

export type MatchWithoutVideo = { id: string; opponent: string; date: string };

/** Partidos ya jugados sin vídeo enlazado, del más reciente al más antiguo. */
export function playedMatchesWithoutVideo(matches: readonly MatchVideoRow[], now: Date): MatchWithoutVideo[] {
  return matches
    .filter((m) => isMatchPast(m.date, m.time, now) && !m.video_url?.trim())
    .map(({ id, opponent, date }) => ({ id, opponent, date }))
    .sort((a, b) => b.date.localeCompare(a.date));
}
