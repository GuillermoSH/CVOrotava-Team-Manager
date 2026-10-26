import { VIDEO_TYPE_LABELS, type VideoType } from "@/lib/videos/constants";

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

/** «12 oct» a partir de `YYYY-MM-DD`. */
function shortDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
}

type TitledVideo = {
  video_type: VideoType;
  match?: { opponent: string } | null;
};

/**
 * Título que se muestra de un vídeo:
 *  - enlazado a un partido: «vs Rival»;
 *  - si no, el título de YouTube cuando es útil;
 *  - si no, el tipo con la fecha de grabación («Partido de Liga del 12 oct»), para que dos
 *    vídeos sin título propio no se vean idénticos.
 * `youtubeTitle` es opcional: las vistas que no lo consultan pasan solo el vídeo.
 */
export function videoTitle(
  video: TitledVideo,
  recordedDate: string,
  youtubeTitle?: string | null
): string {
  if (video.match?.opponent) return `vs ${video.match.opponent}`;
  if (isUsefulYoutubeTitle(youtubeTitle)) return youtubeTitle.trim();
  return `${VIDEO_TYPE_LABELS[video.video_type]} del ${shortDate(recordedDate)}`;
}
