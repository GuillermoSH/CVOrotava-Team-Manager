import type { MatchFormValues } from "@/components/calendar/MatchModal";

/** Shape needed to populate MatchModal from API / list / detail match data */
export type MatchLikeForModal = {
  id: string;
  date: string;
  time: string;
  opponent: string;
  season: string;
  result?: string | null;
  video_url?: string | null;
  notes?: string | null;
  gender: "male" | "female";
  venues: { id: string };
  match_sets?: Array<{
    set_number: number;
    team_score: number;
    opponent_score: number;
  }>;
};

export function matchToModalInitialValues(match: MatchLikeForModal): MatchFormValues {
  const sets = [...(match.match_sets || [])].sort((a, b) => a.set_number - b.set_number);
  return {
    id: match.id,
    date: match.date,
    time: match.time.slice(0, 5),
    opponent: match.opponent,
    season: match.season,
    result: match.result || "",
    video_url: match.video_url || "",
    notes: match.notes || "",
    venue_id: match.venues.id,
    gender: match.gender,
    match_sets: sets.map(({ team_score, opponent_score }) => ({
      team_score,
      opponent_score,
    })),
  };
}
