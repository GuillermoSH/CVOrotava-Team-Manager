import { VIDEO_TYPE_LABELS, type VideoMatchSummary, type VideoType } from "@/lib/videos/constants";

/**
 * Plantillas de título sin rellenar que algunos vídeos conservan en YouTube
 * («Orotava vs [Equipo contrario]»): no sirven como título.
 */
const PLACEHOLDER_TITLE = /equipo\s+contrario|\[[^\]]*\]/i;

/** Título de YouTube aprovechable: con texto y sin plantillas sin rellenar. */
export function isUsefulYoutubeTitle(title: string | null | undefined): title is string {
  const text = title?.trim();
  return Boolean(text) && !PLACEHOLDER_TITLE.test(text!);
}

const GENDER_ABBR = { male: "S.M.", female: "S.F." } as const;

/** `YYYY-MM-DD` (o con hora) → `24-10-2026`. */
export function formatTitleDate(date: string): string {
  const [year, month, day] = date.slice(0, 10).split("-");
  return `${day}-${month}-${year}`;
}

const VENUE_KIND_PREFIX =
  /^(?:pabell[oó]n(?:es)?|pab\.?|polideportivo|polid\.?|pol\.?|mpal\.?|municipal)\s+(?:(?:de|del|la|las|los|el)\s+)?/i;

/** Quita el tipo de instalación del principio: «Pabellón Quiquirá» → «Quiquirá». */
export function shortVenueName(name: string): string {
  let short = name.trim();
  while (VENUE_KIND_PREFIX.test(short)) short = short.replace(VENUE_KIND_PREFIX, "");
  return short || name.trim();
}

function venueOf(match: VideoMatchSummary | null | undefined): string | null {
  const venues = match?.venues;
  const venue = Array.isArray(venues) ? venues[0] : venues;
  const name = venue?.venue_name?.trim();
  return name ? shortVenueName(name) : null;
}

type TitledVideo = {
  video_type: VideoType;
  gender: "male" | "female";
  match?: VideoMatchSummary | null;
};

/**
 * Título que se muestra de un vídeo:
 *  - enlazado a un partido, el completo y compacto:
 *    «Partido de Liga S.M. vs La Palma Voleyball 24-10-2026 Quiquirá»
 *    (S.M./S.F. = Senior masculino/femenino; fecha del partido; pabellón sin «Pabellón»);
 *  - si no, el título de YouTube cuando es útil;
 *  - si no, el tipo, el equipo y la fecha de grabación («Entrenamiento S.M. 05-03-2026»).
 * `youtubeTitle` es opcional: las vistas que no lo consultan pasan solo el vídeo.
 */
export function videoTitle(
  video: TitledVideo,
  recordedDate: string,
  youtubeTitle?: string | null
): string {
  const base = `${VIDEO_TYPE_LABELS[video.video_type]} ${GENDER_ABBR[video.gender]}`;

  if (video.match?.opponent) {
    return [
      base,
      `vs ${video.match.opponent}`,
      formatTitleDate(video.match.date || recordedDate),
      venueOf(video.match),
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (isUsefulYoutubeTitle(youtubeTitle)) return youtubeTitle.trim();
  return `${base} ${formatTitleDate(recordedDate)}`;
}
