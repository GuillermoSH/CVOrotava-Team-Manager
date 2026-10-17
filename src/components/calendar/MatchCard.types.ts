export type Match = {
  id: string;
  date: string;
  time: string;
  opponent: string;
  season: string;
  result?: string;
  video_url?: string;
  notes?: string;
  gender: "male" | "female";
  /** Partido sincronizado con la federación (campos de competición gestionados por el sync). */
  fed_match_id?: number | null;
  /** null en partidos de la federación sin pabellón publicado. */
  venues: {
    id: string;
    venue_name: string;
    location_url?: string;
    location_type: "home" | "away" | "outside_island";
  } | null;
  match_sets?: Array<{
    id?: string;
    set_number: number;
    team_score: number;
    opponent_score: number;
  }>;
};
