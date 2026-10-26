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
const GENDER_LABEL = { male: "Masculino", female: "Femenino" } as const;

const VENUE_KIND_PREFIX =
  /^(?:pabell[oó]n(?:es)?|pab\.?|polideportivo|polid\.?|pol\.?|mpal\.?|municipal)\s+(?:(?:de|del|la|las|los|el)\s+)?/i;

/** Quita el tipo de instalación del principio: «Pabellón Quiquirá» → «Quiquirá». */
export function shortVenueName(name: string): string {
  let short = name.trim();
  while (VENUE_KIND_PREFIX.test(short)) short = short.replace(VENUE_KIND_PREFIX, "");
  return short || name.trim();
}

/** Pabellón del partido, sin el tipo de instalación (la relación llega como objeto o lista). */
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
 * Título corto que se muestra de un vídeo:
 *  - enlazado a un partido: «S.M. vs La Palma Volleyball» (S.M./S.F. = Senior masculino/femenino);
 *  - si no, el título de YouTube cuando es útil;
 *  - si no, el tipo y el equipo («Entrenamiento S.M.»).
 * El detalle (tipo, género, pabellón) va en la descripción: ver `videoDetails`.
 * `youtubeTitle` es opcional: las vistas que no lo consultan pasan solo el vídeo.
 */
export function videoTitle(video: TitledVideo, youtubeTitle?: string | null): string {
  const team = GENDER_ABBR[video.gender];
  if (video.match?.opponent) return `${team} vs ${video.match.opponent}`;
  if (isUsefulYoutubeTitle(youtubeTitle)) return youtubeTitle.trim();
  return `${VIDEO_TYPE_LABELS[video.video_type]} ${team}`;
}

/**
 * Descripción de un vídeo: tipo, género y, si el partido lo tiene, el pabellón.
 * «Partido de Liga · Masculino · Quiquirá»
 */
export function videoDetails(video: TitledVideo): string {
  return [VIDEO_TYPE_LABELS[video.video_type], GENDER_LABEL[video.gender], venueOf(video.match)]
    .filter(Boolean)
    .join(" · ");
}
