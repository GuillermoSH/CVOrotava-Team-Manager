/** Columns used by VideoCard / grid (without join). */
export const VIDEO_LIST_COLUMNS =
  "id, url, created_at, recorded_at, video_type, season, gender, match_id";

/** Select with joined match summary for library grid. */
export const VIDEO_LIST_WITH_MATCH =
  "id, url, created_at, recorded_at, video_type, season, gender, match_id, matches(opponent, date, result)";

export const DEFAULT_VIDEO_PAGE_SIZE = 12;

export const VIDEO_TYPES = [
  "league_match",
  "friendly_match",
  "training",
] as const;

export type VideoType = (typeof VIDEO_TYPES)[number];

export const MATCH_VIDEO_TYPES: VideoType[] = ["league_match", "friendly_match"];

export const VIDEO_TYPE_LABELS: Record<VideoType, string> = {
  league_match: "Partido de Liga",
  friendly_match: "Partido Amistoso",
  training: "Entrenamiento",
};

export const VIDEO_TYPE_GROUP_LABELS: Record<VideoType, string> = {
  league_match: "Partidos de Liga",
  friendly_match: "Partidos Amistosos",
  training: "Entrenamientos",
};

export const VIDEO_TYPE_OPTIONS = VIDEO_TYPES.map((value) => ({
  value,
  label: VIDEO_TYPE_LABELS[value],
}));

export type VideoMatchSummary = {
  opponent: string;
  date: string;
  result: string | null;
};

export type VideoListItem = {
  id: string;
  url: string;
  created_at: string;
  recorded_at: string;
  video_type: VideoType;
  season: string;
  gender: "male" | "female";
  match_id: string | null;
  match?: VideoMatchSummary | null;
};

export type ListVideosOpts = {
  season?: string | null;
  video_type?: VideoType | null;
  gender?: string | null;
  page?: number;
  limit?: number;
  /** Only videos not linked to a match (optionally include forMatchId). */
  withoutMatch?: boolean;
  forMatchId?: string | null;
  /** Picker mode: only match-type videos. */
  matchVideosOnly?: boolean;
};
